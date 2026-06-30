import { apiFetch } from '../utils/api';
import React, { useState, useEffect } from 'react';

function Clients({ token }) {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [clientStats, setClientStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchClients = async () => {
    try {
      const res = await apiFetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchClients();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/clients', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
           
        },
        body: JSON.stringify({ name, phone, email, description })
      });
      if (res.status === 400) {
        const data = await res.json();
        alert(data.error);
        return;
      }

      if (res.ok) {
        setName('');
        setPhone('');
        setEmail('');
        setDescription('');
        fetchClients();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: {  }
      });
      if (res.ok) fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (client) => {
    setEditingId(client.id);
    setEditName(client.name);
    setEditPhone(client.phone);
    setEditEmail(client.email);
    setEditDescription(client.description || '');
  };

  const handleUpdate = async (id) => {
    try {
      const res = await apiFetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
           
        },
        body: JSON.stringify({ name: editName, phone: editPhone, email: editEmail, description: editDescription })
      });
      if (res.ok) {
        setEditingId(null);
        fetchClients();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStats = async (id) => {
    setClientStats(prev => {
      const isShowing = prev[id]?.show;
      if (isShowing) return { ...prev, [id]: { ...prev[id], show: false } };
      return { ...prev, [id]: { stats: prev[id]?.stats || [], loading: !prev[id]?.stats, show: true } };
    });

    if (!clientStats[id] || !clientStats[id].stats) {
      try {
        const res = await apiFetch(`/api/clients/${id}/stats`);
        if (res.ok) {
          const stats = await res.json();
          setClientStats(prev => ({ ...prev, [id]: { stats, loading: false, show: true } }));
        }
      } catch (err) {
        console.error(err);
        setClientStats(prev => ({ ...prev, [id]: { ...prev[id], loading: false } }));
      }
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="page-container">
      <h2>👥 Gestão de Clientes</h2>
      
      <div className="form-card">
        <h3>Novo Cliente</h3>
        <form onSubmit={handleSubmit} className="inline-form">
          <input type="text" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} required />
          <input type="text" placeholder="Telefone" value={phone} onChange={e => setPhone(e.target.value)} />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="text" placeholder="Descrição (ex: Vizinha do 104)" value={description} onChange={e => setDescription(e.target.value)} />
          <button type="submit" className="btn btn-primary">Adicionar</button>
        </form>
      </div>

      <div className="list-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Clientes Cadastrados: {clients.length}</h3>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
            <input 
              type="text" 
              placeholder="Pesquisar cliente..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ paddingLeft: '35px', margin: 0, padding: '8px 10px 8px 35px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>
        {filteredClients.length === 0 ? <p>Nenhum cliente encontrado.</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Email</th>
                <th>Descrição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(c => (
                <React.Fragment key={c.id}>
                  <tr>
                    {editingId === c.id ? (
                      <>
                        <td><input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{width: '100%'}} /></td>
                        <td><input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{width: '100%'}} /></td>
                        <td><input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{width: '100%'}} /></td>
                        <td><input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} style={{width: '100%'}} /></td>
                        <td>
                          <button className="btn btn-primary btn-sm" style={{ marginRight: '5px' }} onClick={() => handleUpdate(c.id)}>Salvar</button>
                          <button className="btn btn-sm" style={{ backgroundColor: '#6c757d', color: 'white' }} onClick={() => setEditingId(null)}>Cancelar</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{c.name}</td>
                        <td>{c.phone}</td>
                        <td>{c.email}</td>
                        <td>{c.description}</td>
                        <td>
                          <button className="btn btn-sm" style={{ backgroundColor: '#28a745', color: 'white', marginRight: '5px' }} onClick={() => toggleStats(c.id)}>Histórico</button>
                          <button className="btn btn-sm" style={{ backgroundColor: '#17a2b8', color: 'white', marginRight: '5px' }} onClick={() => handleEdit(c)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Excluir</button>
                        </td>
                      </>
                    )}
                  </tr>
                  {clientStats[c.id]?.show && (
                    <tr>
                      <td colSpan="5" style={{ backgroundColor: '#f9f9f9', padding: '15px', borderBottom: '2px solid #ddd' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Histórico de Compras</h4>
                        {clientStats[c.id]?.loading ? (
                          <p style={{ margin: 0 }}>Carregando...</p>
                        ) : clientStats[c.id]?.stats.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                            {clientStats[c.id].stats.map((s, idx) => {
                              const dataCompra = s.order_date 
                                ? new Date(s.order_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
                                : 'Data não registrada';

                              return (
                                <li key={idx} style={{ marginBottom: '5px' }}>
                                  <strong>[{dataCompra}]</strong> - {s.product_name} {s.order_flavor && `(${s.order_flavor})`} - <strong>{s.total_quantity} unidade(s)</strong>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p style={{ margin: 0, color: '#666' }}>Nenhuma compra concluída (entregue) registrada.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Clients;
