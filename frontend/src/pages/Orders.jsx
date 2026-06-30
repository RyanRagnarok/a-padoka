import { apiFetch } from '../utils/api';
import React, { useState, useEffect } from 'react';
import Select from 'react-select';

function Orders({ token }) {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro/Pix');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [variationId, setVariationId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [addition, setAddition] = useState(0);
  const [additionDescription, setAdditionDescription] = useState('');
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editProductId, setEditProductId] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editVariationId, setEditVariationId] = useState('');
  const [editDiscount, setEditDiscount] = useState(0);
  const [editAddition, setEditAddition] = useState(0);
  const [editAdditionDescription, setEditAdditionDescription] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editDeliveryTime, setEditDeliveryTime] = useState('');
  const [expandedDates, setExpandedDates] = useState({});
  const [activeTab, setActiveTab] = useState('pendentes');

  const toggleDate = (date) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const fetchProducts = async () => {
    try {
      const res = await apiFetch('/api/products');
      if (res.ok) setProducts(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await apiFetch('/api/clients');
      if (res.ok) setClients(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiFetch('/api/orders');
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchClients();
      fetchOrders();
    }
  }, [token]);

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const product = products.find(p => p.id === selectedProduct.value);
    if (!product) return;
    
    let itemPrice = product.price || 0;
    let selectedVariation = null;

    if (product.variations && product.variations.length > 0) {
      if (!variationId) {
        alert('Por favor, selecione uma opção.');
        return;
      }
      selectedVariation = product.variations.find(v => v.id === parseInt(variationId));
      if (selectedVariation) {
        itemPrice = selectedVariation.price;
      }
    }

    const item_total = (itemPrice * quantity) - discount + addition;
    setCart([...cart, {
      product_id: product.id,
      product_name: product.name,
      quantity,
      flavor: selectedVariation ? selectedVariation.name : '',
      variation_id: selectedVariation ? selectedVariation.id : null,
      discount,
      addition,
      addition_description: additionDescription,
      total_price: item_total
    }]);

    setSelectedProduct(null);
    setQuantity(1);
    setVariationId('');
    setDiscount(0);
    setAddition(0);
    setAdditionDescription('');
  };

  const handleRemoveFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const calculateFee = (sub, method) => {
    if (method === 'Débito') return sub * 0.0089;
    if (method === 'Crédito') return sub * 0.0309;
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Adicione pelo menos um produto ao carrinho.');
      return;
    }

    try {
      const promises = cart.map(item => {
        return apiFetch('/api/orders', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            product_id: item.product_id, 
            client_id: selectedClient ? selectedClient.value : null, 
            quantity: item.quantity, 
            total_price: item.total_price, 
            payment_method: paymentMethod, 
            card_fee: calculateFee(item.total_price, paymentMethod),
            delivery_date: deliveryDate, 
            delivery_time: deliveryTime, 
            flavor: item.flavor,
            variation_id: item.variation_id,
            discount: item.discount, 
            addition: item.addition, 
            addition_description: item.addition_description 
          })
        });
      });

      const results = await Promise.all(promises);
      const hasError = results.some(r => !r.ok);
      if (hasError) throw new Error('Alguns pedidos falharam.');

      alert('Pedido(s) registrado(s) com sucesso! (Pendente de Entrega)');
      setCart([]);
      setSelectedClient(null);
      setDeliveryDate('');
      setDeliveryTime('');
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar venda.');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await apiFetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const togglePaymentStatus = async (id, currentStatus) => {
    try {
      const res = await apiFetch(`/api/orders/${id}/paid`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_paid: !currentStatus })
      });
      if (res.ok) fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrderId(order.id);
    setEditProductId(order.product_id || '');
    setEditQuantity(order.quantity || 1);
    setEditVariationId(order.variation_id || '');
    setEditDiscount(parseFloat(order.discount) || 0);
    setEditAddition(parseFloat(order.addition) || 0);
    setEditAdditionDescription(order.addition_description || '');
    setEditPaymentMethod(order.payment_method || 'Cartão de Crédito');
    const dDate = order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : '';
    setEditDeliveryDate(dDate);
    setEditDeliveryTime(order.delivery_time || '');
  };

  const handleSaveOrderEdit = async (id) => {
    const product = products.find(p => p.id === parseInt(editProductId));
    if (!product) return;
    
    let itemPrice = product.price || 0;
    let selectedVariation = null;
    if (product.variations && product.variations.length > 0 && editVariationId) {
      selectedVariation = product.variations.find(v => v.id === parseInt(editVariationId));
      if (selectedVariation) itemPrice = selectedVariation.price;
    }

    const total_price = (itemPrice * editQuantity) - editDiscount + editAddition;

    try {
      const res = await apiFetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          product_id: editProductId, 
          quantity: editQuantity, 
          flavor: selectedVariation ? selectedVariation.name : '', 
          variation_id: editVariationId || null,
          discount: editDiscount, 
          addition: editAddition, 
          addition_description: editAdditionDescription, 
          total_price, 
          payment_method: editPaymentMethod, 
          delivery_date: editDeliveryDate, 
          delivery_time: editDeliveryTime 
        })
      });
      if (res.ok) {
        setEditingOrderId(null);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteOrder = async (id) => {
    try {
      const res = await apiFetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: {  }
      });
      if (res.ok) fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const renderOrderCard = (o) => (
    <div key={o.id} style={{ border: '1px solid #eee', padding: '10px', borderRadius: '5px', marginBottom: '10px', background: '#fff' }}>
      {editingOrderId === o.id ? (
        <>
          <select value={editProductId} onChange={e => { setEditProductId(e.target.value); setEditVariationId(''); }} style={{ width: '100%', marginBottom: '5px', padding: '5px' }}>
            <option value="">Selecione um produto...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} {(!p.variations || p.variations.length === 0) ? `- R$ ${p.price}` : ''}</option>)}
          </select>
          
          {editProductId && products.find(p => p.id === parseInt(editProductId))?.variations?.length > 0 && (
            <select value={editVariationId} onChange={e => setEditVariationId(e.target.value)} style={{ width: '100%', marginBottom: '5px', padding: '5px' }}>
              <option value="">Variação...</option>
              {products.find(p => p.id === parseInt(editProductId)).variations.map(v => (
                <option key={v.id} value={v.id}>{v.name} - R$ {v.price}</option>
              ))}
            </select>
          )}

          <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
            <input type="number" min="1" value={editQuantity} onChange={e => setEditQuantity(parseInt(e.target.value))} placeholder="Qtd" title="Quantidade" style={{ flex: 1, padding: '5px' }} />
            <input type="number" min="0" step="0.01" value={editDiscount} onChange={e => setEditDiscount(parseFloat(e.target.value) || 0)} placeholder="Desconto (R$)" title="Desconto (R$)" style={{ flex: 1, padding: '5px' }} />
            <input type="number" min="0" step="0.01" value={editAddition} onChange={e => setEditAddition(parseFloat(e.target.value) || 0)} placeholder="Acréscimo (R$)" title="Acréscimo (R$)" style={{ flex: 1, padding: '5px' }} />
          </div>

          {editAddition > 0 && (
            <input type="text" value={editAdditionDescription} onChange={e => setEditAdditionDescription(e.target.value)} placeholder="Descrição do Acréscimo" style={{ width: '100%', marginBottom: '5px', padding: '5px' }} />
          )}

          <select value={editPaymentMethod} onChange={e => setEditPaymentMethod(e.target.value)} style={{ width: '100%', marginBottom: '5px', padding: '5px' }}>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Cartão de Débito">Cartão de Débito</option>
            <option value="PIX">PIX</option>
            <option value="Dinheiro">Dinheiro</option>
          </select>
          <input type="date" value={editDeliveryDate} onChange={e => setEditDeliveryDate(e.target.value)} style={{ width: '100%', marginBottom: '5px', padding: '5px' }} />
          <input type="time" value={editDeliveryTime} onChange={e => setEditDeliveryTime(e.target.value)} style={{ width: '100%', marginBottom: '5px', padding: '5px' }} />
          <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1, margin: 0, padding: '5px' }} onClick={() => handleSaveOrderEdit(o.id)}>Salvar</button>
            <button className="btn btn-sm" style={{ flex: 1, margin: 0, padding: '5px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setEditingOrderId(null)}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          <strong>{o.product_name} {o.flavor && `(${o.flavor})`}</strong> (Qtd: {o.quantity})<br/>
          {o.client_name && <><small style={{color: '#0056b3'}}>👤 {o.client_name}</small><br/></>}
          <small>Entrega: <strong style={{ color: '#d97706' }}>{o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'} às {o.delivery_time || 'N/A'}</strong></small><br/>
          <small>Pagamento: {o.payment_method || 'N/A'}</small><br/>
          {parseFloat(o.discount) > 0 && <><small style={{color: '#d9534f'}}>Desconto: R$ {o.discount}</small><br/></>}
          {parseFloat(o.addition) > 0 && <><small style={{color: '#28a745'}}>Acréscimo: R$ {o.addition} ({o.addition_description})</small><br/></>}
          <small><strong>Total: R$ {o.total_price}</strong></small><br/>
          <div style={{ marginTop: '8px', padding: '5px', backgroundColor: o.is_paid ? '#d4edda' : '#f8d7da', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', border: o.is_paid ? '1px solid #c3e6cb' : '1px solid #f5c6cb' }}>
            <input 
              type="checkbox" 
              checked={o.is_paid || false} 
              onChange={() => togglePaymentStatus(o.id, o.is_paid)} 
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <span style={{ fontSize: '0.9rem', color: o.is_paid ? '#155724' : '#721c24', fontWeight: 'bold' }}>
              {o.is_paid ? '✅ Pagamento Confirmado' : '⚠️ Aguardando Pagamento'}
            </span>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1, margin: 0, padding: '5px', minWidth: '40%' }} onClick={() => updateStatus(o.id, 'Entregue')}>Entregar</button>
            <button className="btn btn-sm" style={{ flex: 1, margin: 0, padding: '5px', minWidth: '40%', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => handleEditOrder(o)}>Editar</button>
            <button className="btn btn-sm" style={{ flex: 1, margin: 0, padding: '5px', minWidth: '40%', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => updateStatus(o.id, 'Cancelado')}>Cancelar</button>
          </div>
        </>
      )}
    </div>
  );

  const groupedOrders = orders.reduce((acc, order) => {
    const dateStr = order.delivery_date ? order.delivery_date.split('T')[0] : 'Sem Data';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(order);
    return acc;
  }, {});

  // Ordena as datas: das mais recentes/futuras para as mais antigas
  const sortedDates = Object.keys(groupedOrders).sort((a, b) => {
    if (a === 'Sem Data') return 1;
    if (b === 'Sem Data') return -1;
    return new Date(b) - new Date(a); 
  });

  const pendingOrders = orders.filter(order => order.status !== 'Entregue' && order.status !== 'Cancelado');

  const subtotal = cart.reduce((acc, item) => acc + item.total_price, 0);
  const fee = calculateFee(subtotal, paymentMethod);
  const netValue = subtotal - fee;

  return (
    <div className="page-container">
      <h2>📦 Registrar Pedido / Venda</h2>
      
      <div className="form-card">
        <h3>Nova Venda</h3>
        {products.length === 0 ? <p>Cadastre produtos primeiro no cardápio!</p> : (
          <div className="form-group">
            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e9ecef' }}>
              <h4 style={{ marginTop: 0, marginBottom: '15px' }}>1. Adicionar Produtos ao Carrinho</h4>
              
              <label>Produto</label>
              <Select
                value={selectedProduct}
                onChange={option => { setSelectedProduct(option); setVariationId(''); }}
                options={products.map(p => {
                  let lbl = p.name;
                  if (!p.variations || p.variations.length === 0) lbl += ` - R$ ${p.price}`;
                  return { value: p.id, label: lbl };
                })}
                placeholder="Pesquise o produto..."
                isClearable
                styles={{ container: (base) => ({ ...base, marginBottom: '15px' }) }}
              />
              
              {selectedProduct && products.find(p => p.id === selectedProduct.value)?.variations?.length > 0 && (
                <>
                  <label>Variação / Opção</label>
                  <select value={variationId} onChange={e => setVariationId(e.target.value)} required style={{ padding: '10px', width: '100%', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}>
                    <option value="">Selecione a opção...</option>
                    {products.find(p => p.id === selectedProduct.value).variations.map(v => (
                      <option key={v.id} value={v.id}>{v.name} - R$ {v.price}</option>
                    ))}
                  </select>
                </>
              )}
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label>Quantidade</label>
                  <input type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} required style={{ padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Desconto (R$)</label>
                  <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} style={{ padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Acréscimo (R$)</label>
                  <input type="number" min="0" step="0.01" value={addition} onChange={e => setAddition(parseFloat(e.target.value) || 0)} style={{ padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
              </div>

              {addition > 0 && (
                <>
                  <label>Descrição do Acréscimo</label>
                  <input type="text" value={additionDescription} onChange={e => setAdditionDescription(e.target.value)} placeholder="Ex: Embalagem extra" style={{ padding: '10px', width: '100%', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </>
              )}

              <button type="button" onClick={handleAddToCart} className="btn btn-secondary" style={{ width: '100%', backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>+ Adicionar ao Carrinho</button>
            </div>

            {cart.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4>🛒 Carrinho ({cart.length} itens)</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, border: '1px solid #ccc', borderRadius: '8px' }}>
                  {cart.map((item, index) => (
                    <li key={index} style={{ padding: '10px', borderBottom: index < cart.length - 1 ? '1px solid #eee' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{item.quantity}x {item.product_name}</strong> {item.flavor && `(${item.flavor})`} <br/>
                        <small>Total: R$ {item.total_price.toFixed(2)}</small>
                      </div>
                      <button type="button" onClick={() => handleRemoveFromCart(index)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                    </li>
                  ))}
                </ul>
                <div style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                  Total do Pedido: R$ {cart.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <h4 style={{ marginTop: 0, marginBottom: '15px' }}>2. Detalhes do Pedido</h4>
              <label>Cliente (Opcional)</label>
              <Select
                value={selectedClient}
                onChange={option => setSelectedClient(option)}
                options={clients.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Cliente Balcão (Sem cadastro)"
                isClearable
                styles={{ container: (base) => ({ ...base, marginBottom: '15px' }) }}
              />

              <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                  Forma de Pagamento:
                </label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '15px' }}
                >
                  <option value="Dinheiro/Pix">Dinheiro / Pix (Sem taxa)</option>
                  <option value="Débito">Cartão de Débito (0,89% retido)</option>
                  <option value="Crédito">Cartão de Crédito (3,09% retido)</option>
                </select>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '1.1em' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.3em' }}>
                    <span>Cobrar na Maquininha:</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  
                  {fee > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d9534f', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                        <span>Desconto da Maquininha:</span>
                        <span>- R$ {fee.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#28a745', fontWeight: 'bold' }}>
                        <span>Valor Líquido (Padoka):</span>
                        <span>R$ {netValue.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <label>Data de Entrega</label>
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} required style={{ padding: '10px', width: '100%', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />

              <label>Horário de Entrega</label>
              <input type="time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} required style={{ padding: '10px', width: '100%', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={cart.length === 0}>Finalizar Pedido ({cart.length} itens)</button>
            </form>
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
          <button 
            onClick={() => setActiveTab('pendentes')}
            style={{ 
              padding: '10px 20px', 
              border: 'none', 
              backgroundColor: activeTab === 'pendentes' ? '#d97706' : 'transparent',
              color: activeTab === 'pendentes' ? '#fff' : '#666',
              fontWeight: 'bold',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Pendentes ({pendingOrders.length})
          </button>
          
          <button 
            onClick={() => setActiveTab('historico')}
            style={{ 
              padding: '10px 20px', 
              border: 'none', 
              backgroundColor: activeTab === 'historico' ? '#d97706' : 'transparent',
              color: activeTab === 'historico' ? '#fff' : '#666',
              fontWeight: 'bold',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Histórico por Dia
          </button>
        </div>

        {activeTab === 'pendentes' && (
          <div className="pending-orders-list">
            {pendingOrders.length === 0 ? (
               <p style={{ color: '#666', fontStyle: 'italic' }}>Nenhum pedido pendente! 🎉</p>
            ) : (
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                 {pendingOrders.map(order => renderOrderCard(order))}
               </div>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <>
            <h3>Painel de Pedidos por Dia</h3>
            {sortedDates.length === 0 && <p style={{ fontSize: '0.9rem', color: '#666' }}>Nenhum pedido registrado.</p>}
            
            {sortedDates.map(date => {
          const dateOrders = groupedOrders[date];
          const isExpanded = expandedDates[date];
          const dateTitle = date === 'Sem Data' ? 'Sem Data Definida' : new Date(date + 'T12:00:00Z').toLocaleDateString('pt-BR');

          return (
            <div key={date} style={{ marginBottom: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              
              {/* Cabeçalho Expansível do Dia */}
              <div
                onClick={() => toggleDate(date)}
                style={{ padding: '15px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', borderBottom: isExpanded ? '1px solid #eee' : 'none' }}
              >
                <h4 style={{ margin: 0, color: 'var(--accent-color)' }}>
                  📅 {dateTitle} <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'normal' }}>({dateOrders.length} pedidos)</span>
                </h4>
                <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  {isExpanded ? '▼ Ocultar' : '▶ Ver Pedidos'}
                </span>
              </div>

              {/* Grid de 3 Colunas (Visível apenas se expandido) */}
              {isExpanded && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', padding: '20px' }}>
                  
                  {/* COLUNA PENDENTES */}
                  <div>
                    <h4 style={{ borderBottom: '2px solid #ffc107', paddingBottom: '10px' }}>
                      🟡 Pendentes ({dateOrders.filter(o => o.status === 'Pendente').length})
                    </h4>
                    {dateOrders.filter(o => o.status === 'Pendente').map(o => renderOrderCard(o))}
                    {dateOrders.filter(o => o.status === 'Pendente').length === 0 && <p style={{ fontSize: '0.9rem', color: '#666' }}>Nenhum pedido pendente.</p>}
                  </div>

                  {/* COLUNA ENTREGUES */}
                  <div>
                    <h4 style={{ borderBottom: '2px solid #28a745', paddingBottom: '10px' }}>
                      🟢 Entregues ({dateOrders.filter(o => o.status === 'Entregue').length})
                    </h4>
                    {dateOrders.filter(o => o.status === 'Entregue').map(o => (
                      <div key={o.id} style={{ border: '1px solid #eee', padding: '10px', borderRadius: '5px', marginBottom: '10px', opacity: 0.8 }}>
                        <strong>{o.product_name} {o.flavor && `(${o.flavor})`}</strong> (Qtd: {o.quantity})<br/>
                        {o.client_name && <><small style={{color: '#0056b3'}}>👤 {o.client_name}</small><br/></>}
                        <small>Entrega: {o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'} às {o.delivery_time || 'N/A'}</small><br/>
                        {parseFloat(o.discount) > 0 && <><small style={{color: '#d9534f'}}>Desconto: R$ {o.discount}</small><br/></>}
                        {parseFloat(o.addition) > 0 && <><small style={{color: '#28a745'}}>Acréscimo: R$ {o.addition} ({o.addition_description})</small><br/></>}
                        <small><strong>Total: R$ {o.total_price}</strong></small><br/>
                        <div style={{ marginTop: '8px', padding: '5px', backgroundColor: o.is_paid ? '#d4edda' : '#f8d7da', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', border: o.is_paid ? '1px solid #c3e6cb' : '1px solid #f5c6cb' }}>
                          <input 
                            type="checkbox" 
                            checked={o.is_paid || false} 
                            onChange={() => togglePaymentStatus(o.id, o.is_paid)} 
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          <span style={{ fontSize: '0.9rem', color: o.is_paid ? '#155724' : '#721c24', fontWeight: 'bold' }}>
                            {o.is_paid ? '✅ Pagamento Confirmado' : '⚠️ Aguardando Pagamento'}
                          </span>
                        </div>
                        <button className="btn btn-sm" style={{ marginTop: '10px', width: '100%', backgroundColor: '#ffc107', color: 'black', border: 'none', padding: '5px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => updateStatus(o.id, 'Pendente')}>Desfazer Entrega</button>
                      </div>
                    ))}
                    {dateOrders.filter(o => o.status === 'Entregue').length === 0 && <p style={{ fontSize: '0.9rem', color: '#666' }}>Nenhum pedido entregue.</p>}
                  </div>

                  {/* COLUNA CANCELADOS */}
                  <div>
                    <h4 style={{ borderBottom: '2px solid #dc3545', paddingBottom: '10px' }}>
                      🔴 Cancelados ({dateOrders.filter(o => o.status === 'Cancelado').length})
                    </h4>
                    {dateOrders.filter(o => o.status === 'Cancelado').map(o => (
                      <div key={o.id} style={{ border: '1px solid #eee', padding: '10px', borderRadius: '5px', marginBottom: '10px', opacity: 0.8 }}>
                        <strong>{o.product_name} {o.flavor && `(${o.flavor})`}</strong> (Qtd: {o.quantity})<br/>
                        {o.client_name && <><small style={{color: '#0056b3'}}>👤 {o.client_name}</small><br/></>}
                        <small>Entrega: {o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'} às {o.delivery_time || 'N/A'}</small><br/>
                        {parseFloat(o.discount) > 0 && <><small style={{color: '#d9534f'}}>Desconto: R$ {o.discount}</small><br/></>}
                        {parseFloat(o.addition) > 0 && <><small style={{color: '#28a745'}}>Acréscimo: R$ {o.addition} ({o.addition_description})</small><br/></>}
                        <small><strong>Total: R$ {o.total_price}</strong></small><br/>
                        <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                          <button className="btn btn-sm" style={{ flex: 1, backgroundColor: '#ffc107', color: 'black', border: 'none', padding: '5px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => updateStatus(o.id, 'Pendente')}>Reabrir</button>
                          <button className="btn btn-sm" style={{ flex: 1, backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => deleteOrder(o.id)}>Excluir</button>
                        </div>
                      </div>
                    ))}
                    {dateOrders.filter(o => o.status === 'Cancelado').length === 0 && <p style={{ fontSize: '0.9rem', color: '#666' }}>Nenhum pedido cancelado.</p>}
                  </div>

                </div>
              )}
            </div>
          );
        })}
          </>
        )}
      </div>
    </div>
  );
}

export default Orders;
