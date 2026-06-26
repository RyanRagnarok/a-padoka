import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

function CashFlow({ token }) {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'Despesa' ou 'Perda'
  const [editId, setEditId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');

  const [filterMonth, setFilterMonth] = useState('');
  const [search, setSearch] = useState('');

  const fetchTransactions = async () => {
    try {
      const res = await apiFetch('/api/transactions');
      if (res.ok) {
        setTransactions(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchTransactions();
  }, [token]);

  const openModal = (type, transaction = null) => {
    if (transaction) {
      setEditId(transaction.id);
      setModalType(transaction.category === 'Perda' ? 'Perda' : 'Despesa');
      setDate(transaction.date.substring(0, 10));
      setDescription(transaction.description);
      setCategory(transaction.category);
      setAmount(transaction.amount);
    } else {
      setEditId(null);
      setModalType(type);
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setCategory(type === 'Perda' ? 'Perda' : 'Custo Fixo');
      setAmount('');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("O valor deve ser maior que zero.");
      return;
    }

    try {
      const url = editId ? `/api/transactions/${editId}` : '/api/transactions';
      const method = editId ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          description,
          category,
          type: 'Saída', // As per the rules, manually added ones are generally Saídas (Despesa/Perda)
          amount: parseFloat(amount)
        })
      });

      if (res.ok) {
        fetchTransactions();
        closeModal();
      } else {
        alert("Erro ao salvar transação.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este lançamento?")) return;
    try {
      const res = await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      // Use native fetch to automatically set multipart/form-data boundary
      const res = await fetch('/api/finance/upload-receipt', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        body: formData 
      });

      if (res.ok) {
        alert('Despesa registrada com sucesso pela IA!');
        fetchTransactions();
      } else {
        const errData = await res.json();
        alert(`Erro: ${errData.message}`);
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão ao enviar a nota.');
    } finally {
      setIsUploading(false);
      event.target.value = null; // Clear input
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const tMonth = t.date.substring(0, 7); // YYYY-MM
    const matchMonth = filterMonth ? tMonth === filterMonth : true;
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase());
    return matchMonth && matchSearch;
  });

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2>💸 Fluxo de Caixa (Operacional)</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn" style={{ backgroundColor: '#EF4444' }} onClick={() => openModal('Despesa')}>+ Registrar Despesa</button>
          <button className="btn" style={{ backgroundColor: '#B91C1C' }} onClick={() => openModal('Perda')}>+ Registrar Perda</button>
          
          <label className="btn" style={{ backgroundColor: '#6f42c1', color: 'white', cursor: 'pointer', margin: 0, opacity: isUploading ? 0.7 : 1 }}>
            {isUploading ? 'Lendo Nota...' : '📸 Ler Cupom com IA'}
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              capture="environment" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      <div className="form-card" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mês/Ano</label>
          <input 
            type="month" 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)} 
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ flex: 2, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Buscar Descrição</label>
          <input 
            type="text" 
            placeholder="Pesquise por uma transação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => { setFilterMonth(''); setSearch(''); }}>Limpar Filtros</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '12px' }}>Data</th>
              <th style={{ padding: '12px' }}>Descrição</th>
              <th style={{ padding: '12px' }}>Categoria</th>
              <th style={{ padding: '12px' }}>Tipo</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Valor</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Nenhum lançamento encontrado.</td>
              </tr>
            ) : (
              filteredTransactions.map(t => (
                <React.Fragment key={t.id}>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{t.description}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', backgroundColor: '#e2e8f0' }}>{t.category}</span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: t.type === 'Entrada' ? '#10B981' : '#EF4444' }}>
                      {t.type === 'Entrada' ? '↑ Entrada' : '↓ Saída'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(t.amount)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {t.details && t.details.length > 0 && (
                        <button 
                          className="btn-sm" 
                          style={{ cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: '#17a2b8', color: 'white', marginRight: '5px', padding: '5px 8px' }} 
                          onClick={() => toggleRow(t.id)}
                        >
                          {expandedRows[t.id] ? 'Ocultar Itens' : 'Ver Itens'}
                        </button>
                      )}
                      <button className="btn-sm" style={{ cursor: 'pointer', border: 'none', borderRadius: '4px', marginRight: '5px', backgroundColor: '#3B82F6', color: '#fff', padding: '5px 8px' }} onClick={() => openModal(null, t)}>✏️</button>
                      <button className="btn-sm btn-danger" style={{ cursor: 'pointer', border: 'none', borderRadius: '4px' }} onClick={() => handleDelete(t.id)}>🗑️</button>
                    </td>
                  </tr>
                  
                  {expandedRows[t.id] && t.details && (
                    <tr>
                      <td colSpan="6" style={{ backgroundColor: '#f9f9f9', padding: '15px' }}>
                        <h5 style={{ margin: '0 0 10px 0' }}>Itens do Cupom</h5>
                        <table className="data-table" style={{ background: 'white', border: '1px solid #ddd', width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '8px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>Produto</th>
                              <th style={{ padding: '8px', textAlign: 'center', backgroundColor: '#f0f0f0' }}>Qtd</th>
                              <th style={{ padding: '8px', textAlign: 'right', backgroundColor: '#f0f0f0' }}>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.details.map((detalhe, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{detalhe.descricao}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                  {detalhe.quantidade || '1'}
                                </td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                                  {formatCurrency(detalhe.valor)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>{editId ? 'Editar' : 'Registrar'} {modalType}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ex: Compra de Trigo" />
              </div>
              
              {modalType === 'Despesa' && (
                <div className="form-group">
                  <label>Categoria</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <option value="Insumo">Insumo</option>
                    <option value="Custo Fixo">Custo Fixo</option>
                    <option value="Salários">Salários</option>
                    <option value="Impostos">Impostos</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  required 
                  placeholder="0.00" 
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn" style={{ flex: 1, backgroundColor: modalType === 'Perda' ? '#B91C1C' : '#EF4444' }}>Salvar</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={closeModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashFlow;
