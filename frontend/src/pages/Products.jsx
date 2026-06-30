import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

function Products({ token }) {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Salgados');
  const [variations, setVariations] = useState([]);
  const [tempSize, setTempSize] = useState('Pedaço Comum');
  const [tempFlavor, setTempFlavor] = useState('');
  const [tempPrice, setTempPrice] = useState('');

  const handleAddVariation = () => {
    if (!tempFlavor || !tempPrice) {
      alert("Preencha o sabor e o preço!");
      return;
    }
    const fullName = `${tempSize} - ${tempFlavor}`;
    setVariations([...variations, { name: fullName, price: parseFloat(tempPrice) }]);
    setTempFlavor('');
    setTempPrice('');
  };

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editVariations, setEditVariations] = useState([]);
  const [tempEditSize, setTempEditSize] = useState('Pedaço Comum');
  const [tempEditFlavor, setTempEditFlavor] = useState('');
  const [tempEditPrice, setTempEditPrice] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await apiFetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchProducts();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (variations.some(v => !v.name || !v.price)) {
      alert('Preencha nome e preço para todas as variações.');
      return;
    }
    try {
      const res = await apiFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, category, variations })
      });
      if (res.ok) {
        setName('');
        setDescription('');
        setCategory('Salgados');
        setVariations([]);
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setEditName(product.name);
    setEditDescription(product.description || '');
    setEditCategory(product.category || 'Salgados');
    if (product.variations && product.variations.length > 0) {
      setEditVariations(product.variations);
    } else {
      const oldVariations = [];
      if (product.has_flavors && product.flavors) {
        product.flavors.split(',').forEach(f => {
          oldVariations.push({ name: f.trim(), price: product.price });
        });
      } else {
        oldVariations.push({ name: 'Única', price: product.price });
      }
      setEditVariations(oldVariations);
    }
  };

  const handleUpdate = async (id) => {
    if (editVariations.some(v => !v.name || !v.price)) {
      alert('Preencha nome e preço para todas as variações.');
      return;
    }
    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription, category: editCategory, variations: editVariations })
      });
      if (res.ok) {
        setEditingId(null);
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveVariation = (index) => setVariations(variations.filter((_, i) => i !== index));
  const handleVariationChange = (index, field, value) => {
    const newVars = [...variations];
    newVars[index][field] = value;
    setVariations(newVars);
  };

  const handleAddEditVariation = () => {
    if (!tempEditFlavor || !tempEditPrice) {
      alert("Preencha o sabor e o preço!");
      return;
    }
    const fullName = `${tempEditSize} - ${tempEditFlavor}`;
    setEditVariations([...editVariations, { name: fullName, price: parseFloat(tempEditPrice) }]);
    setTempEditFlavor('');
    setTempEditPrice('');
  };
  const handleRemoveEditVariation = (index) => setEditVariations(editVariations.filter((_, i) => i !== index));
  const handleEditVariationChange = (index, field, value) => {
    const newVars = [...editVariations];
    newVars[index][field] = value;
    setEditVariations(newVars);
  };

  return (
    <div className="page-container">
      <h2>🥐 Gestão de Produtos</h2>
      
      <div className="form-card">
        <h3>Novo Produto</h3>
        <form onSubmit={handleSubmit} className="inline-form">
          <input type="text" placeholder="Nome do Produto" value={name} onChange={e => setName(e.target.value)} required />
          <input type="text" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
            <option value="Salgados">Salgados</option>
            <option value="Doces">Doces</option>
            <option value="Bebidas">Bebidas</option>
            <option value="Outros">Outros</option>
          </select>
          <div style={{ width: '100%', marginTop: '15px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Variações (SKUs)</h4>
            <div className="add-variation-section" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
              <select 
                value={tempSize} 
                onChange={(e) => setTempSize(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="Pedaço Comum">Pedaço Comum</option>
                <option value="Pedaço Recheado">Pedaço Recheado</option>
                <option value="Inteiro Comum">Inteiro Comum</option>
                <option value="Inteiro Recheado">Inteiro Recheado</option>
                <option value="Mini">Mini</option>
              </select>

              <input 
                type="text" 
                placeholder="Sabor (Ex: Nutella)" 
                value={tempFlavor}
                onChange={(e) => setTempFlavor(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
              />

              <input 
                type="number" 
                step="0.01"
                placeholder="R$ 0,00" 
                value={tempPrice}
                onChange={(e) => setTempPrice(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100px' }}
              />

              <button 
                type="button" 
                onClick={handleAddVariation}
                style={{ padding: '8px 12px', backgroundColor: '#f0ad4e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                + Add
              </button>
            </div>
            {variations.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                {variations.map((v, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9f9f9', border: '1px solid #eee', marginBottom: '5px', borderRadius: '4px' }}>
                    <span>{v.name} - R$ {Number(v.price).toFixed(2)}</span>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveVariation(index)}>X</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-primary">Adicionar</button>
        </form>
      </div>

      <div className="list-container">
        <h3>Catálogo</h3>
        {products.length === 0 ? <p>Nenhum produto cadastrado.</p> : (
          Object.entries(products.reduce((acc, p) => {
            const cat = p.category || 'Outros';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(p);
            return acc;
          }, {})).map(([cat, items]) => (
            <div key={cat} className="category-section">
              <h4 style={{ color: 'var(--primary-color)', borderBottom: '2px solid var(--secondary-color)', paddingBottom: '5px', marginTop: '20px' }}>{cat}</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Descrição</th>
                    <th>Preço / Variações</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => (
                    <tr key={p.id}>
                      {editingId === p.id ? (
                        <>
                          <td>
                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{width: '100%', marginBottom: '5px'}} />
                            <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{width: '100%', padding: '2px'}}>
                              <option value="Salgados">Salgados</option>
                              <option value="Doces">Doces</option>
                              <option value="Bebidas">Bebidas</option>
                              <option value="Outros">Outros</option>
                            </select>
                          </td>
                          <td><input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} style={{width: '100%'}} /></td>
                          <td>
                            {editVariations.map((v, index) => (
                              <div key={index} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                <input type="text" value={v.name} onChange={e => handleEditVariationChange(index, 'name', e.target.value)} placeholder="Variação" style={{flex: 1, fontSize: '0.8em', padding: '2px'}} required />
                                <input type="number" step="0.01" value={v.price} onChange={e => handleEditVariationChange(index, 'price', e.target.value)} placeholder="Preço" style={{width: '60px', fontSize: '0.8em', padding: '2px'}} required />
                                <button type="button" style={{background: 'none', border: 'none', color: 'red', cursor: 'pointer', padding: '0 5px'}} onClick={() => handleRemoveEditVariation(index)}>x</button>
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginTop: '10px' }}>
                              <select 
                                value={tempEditSize} 
                                onChange={(e) => setTempEditSize(e.target.value)}
                                style={{ padding: '2px', borderRadius: '3px', border: '1px solid #ccc', fontSize: '0.8em' }}
                              >
                                <option value="Pedaço Comum">Pedaço Comum</option>
                                <option value="Pedaço Recheado">Pedaço Recheado</option>
                                <option value="Inteiro Comum">Inteiro Comum</option>
                                <option value="Inteiro Recheado">Inteiro Recheado</option>
                                <option value="Mini">Mini</option>
                              </select>
                              <input 
                                type="text" 
                                placeholder="Sabor" 
                                value={tempEditFlavor}
                                onChange={(e) => setTempEditFlavor(e.target.value)}
                                style={{ padding: '2px', borderRadius: '3px', border: '1px solid #ccc', flex: 1, fontSize: '0.8em' }}
                              />
                              <input 
                                type="number" 
                                step="0.01"
                                placeholder="R$" 
                                value={tempEditPrice}
                                onChange={(e) => setTempEditPrice(e.target.value)}
                                style={{ padding: '2px', borderRadius: '3px', border: '1px solid #ccc', width: '50px', fontSize: '0.8em' }}
                              />
                              <button 
                                type="button" 
                                onClick={handleAddEditVariation}
                                style={{ padding: '2px 5px', backgroundColor: '#f0ad4e', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8em' }}
                              >
                                + Add
                              </button>
                            </div>
                          </td>
                          <td>
                            <button className="btn btn-primary btn-sm" style={{ marginRight: '5px', marginBottom: '5px' }} onClick={() => handleUpdate(p.id)}>Salvar</button>
                            <button className="btn btn-sm" style={{ backgroundColor: '#6c757d', color: 'white' }} onClick={() => setEditingId(null)}>Cancelar</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{p.name}</td>
                          <td>{p.description}</td>
                          <td>
                            {p.variations && p.variations.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {p.variations.map(v => (
                                  <span key={v.id} style={{ fontSize: '0.85em', background: '#e9ecef', padding: '3px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                    {v.name}: <strong>R$ {v.price}</strong>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span>R$ {p.price} <small>(Legado)</small></span>
                            )}
                          </td>
                          <td>
                            <button className="btn btn-sm" style={{ backgroundColor: '#17a2b8', color: 'white', marginRight: '5px' }} onClick={() => handleEdit(p)}>Editar</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Excluir</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Products;
