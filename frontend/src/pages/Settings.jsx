import { apiFetch } from '../utils/api';
import React, { useState } from 'react';

function Settings({ token }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação não coincidem.');
      return;
    }

    try {
      const res = await apiFetch('/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || 'Erro ao alterar a senha.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao tentar alterar a senha.');
    }
  };

  return (
    <div className="page-container">
      <h2>⚙️ Configurações da Conta</h2>
      
      <div className="form-card" style={{ maxWidth: '500px', marginTop: '20px' }}>
        <h3>Trocar Senha</h3>
        {message && <p style={{ color: 'green', marginBottom: '15px' }}>{message}</p>}
        {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}
        
        <form onSubmit={handleChangePassword} className="form-group">
          <label>Senha Atual</label>
          <input 
            type="password" 
            value={currentPassword} 
            onChange={e => setCurrentPassword(e.target.value)} 
            required 
            style={{ padding: '10px', width: '100%', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
          />

          <label>Nova Senha</label>
          <input 
            type="password" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)} 
            required 
            minLength={6}
            style={{ padding: '10px', width: '100%', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
          />

          <label>Confirmar Nova Senha</label>
          <input 
            type="password" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            required 
            minLength={6}
            style={{ padding: '10px', width: '100%', marginBottom: '20px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
          />

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Salvar Nova Senha</button>
        </form>
      </div>
    </div>
  );
}

export default Settings;
