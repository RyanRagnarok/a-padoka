import { apiFetch } from '../utils/api';
import React, { useState, useEffect } from 'react';

function Products({ token }) {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Salgados');
  const [hasFlavors, setHasFlavors] = useState(false);
  const [flavors, setFlavors] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editHasFlavors, setEditHasFlavors] = useState(false);
  const [editFlavors, setEditFlavors] = useState('');

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
    try {
      const res = await apiFetch('/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
           
        },
        body: JSON.stringify({ name, description, price, category, has_flavors: hasFlavors, flavors })
      });
      if (res.ok) {
        setName('');
        setDescription('');
        setPrice('');
        setCategory('Salgados');
        setHasFlavors(false);
        setFlavors('');
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {  }
      });
      if (res.ok) fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setEditName(product.name);
    setEditDescription(product.description || '');
    setEditPrice(product.price);
    setEditCategory(product.category || 'Salgados');
    setEditHasFlavors(product.has_flavors || false);
    setEditFlavors(product.flavors || '');
  };

  const handleUpdate = async (id) => {
    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
           
        },
        body: JSON.stringify({ name: editName, description: editDescription, price: editPrice, category: editCategory, has_flavors: editHasFlavors, flavors: editFlavors })
      });
      if (res.ok) {
        setEditingId(null);
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      <h2>🥐 Gestão de Produtos</h2>
      
      <div className="form-card">
        <h3>Novo Produto</h3>
        <form onSubmit={handleSubmit} className="inline-form">
          <input type="text" placeholder="Nome do Produto" value={name} onChange={e => setName(e.target.value)} required />
          <input type="text" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
          <input type="number" step="0.01" placeholder="Preço" value={price} onChange={e => setPrice(e.target.value)} required />
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
            <option value="Salgados">Salgados</option>
            <option value="Doces">Doces</option>
            <option value="Bebidas">Bebidas</option>
            <option value="Outros">Outros</option>
          </select>
          <div style={{ width: '100%', marginBottom: '10px', marginTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={hasFlavors} onChange={e => setHasFlavors(e.target.checked)} />
              Este produto tem opções de sabor?
            </label>
          </div>
          {hasFlavors && (
            <input type="text" placeholder="Sabores (separados por vírgula. Ex: Frango, Calabresa)" value={flavors} onChange={e => setFlavors(e.target.value)} required style={{ width: '100%', marginBottom: '10px' }} />
          )}
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
                    <th>Preço</th>
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
                            <label style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <input type="checkbox" checked={editHasFlavors} onChange={e => setEditHasFlavors(e.target.checked)} />
                              Tem Sabores?
                            </label>
                            {editHasFlavors && (
                              <input type="text" value={editFlavors} onChange={e => setEditFlavors(e.target.value)} placeholder="Sabor 1, Sabor 2" style={{width: '100%', fontSize: '0.8em', marginTop: '5px'}} />
                            )}
                          </td>
                          <td><input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} style={{width: '100%'}} /></td>
                          <td>
                            <input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{width: '70px', marginBottom: '5px'}} />
                            <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{width: '100%', padding: '2px'}}>
                              <option value="Salgados">Salgados</option>
                              <option value="Doces">Doces</option>
                              <option value="Bebidas">Bebidas</option>
                              <option value="Outros">Outros</option>
                            </select>
                          </td>
                          <td>
                            <button className="btn btn-primary btn-sm" style={{ marginRight: '5px', marginBottom: '5px' }} onClick={() => handleUpdate(p.id)}>Salvar</button>
                            <button className="btn btn-sm" style={{ backgroundColor: '#6c757d', color: 'white' }} onClick={() => setEditingId(null)}>Cancelar</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{p.name} {p.has_flavors && <div style={{fontSize: '0.8em', color: '#666', marginTop: '4px'}}>Sabores: {p.flavors}</div>}</td>
                          <td>{p.description}</td>
                          <td>R$ {p.price}</td>
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
