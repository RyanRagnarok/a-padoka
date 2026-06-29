import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Products from './pages/Products';
import Clients from './pages/Clients';
import Orders from './pages/Orders';
import Finance from './pages/Finance';
import CashFlow from './pages/CashFlow';
import Settings from './pages/Settings';
import Recipes from './pages/Recipes';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  if (!token) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const loggedUser = localStorage.getItem('username') || 'Usuário';

  return (
    <BrowserRouter>
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-brand">🍞 A Padoka</div>
          <div className="nav-links">
            <Link to="/">Início</Link>
            <Link to="/pedidos">Pedidos</Link>
            <Link to="/produtos">Produtos</Link>
            <Link to="/receitas">Receitas & Fichas</Link>
            <Link to="/clientes">Clientes</Link>
            <Link to="/fluxo-caixa">Fluxo de Caixa</Link>
            <Link to="/financeiro">DRE & KPIs</Link>
            <Link to="/configuracoes">Perfil</Link>
            <span style={{color: 'inherit', marginRight: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'}}>👤 {loggedUser}</span>
            <button onClick={handleLogout} className="btn-logout">Sair</button>
          </div>
        </nav>
        <div className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pedidos" element={<Orders token={token} />} />
            <Route path="/produtos" element={<Products token={token} />} />
            <Route path="/receitas" element={<Recipes token={token} />} />
            <Route path="/clientes" element={<Clients token={token} />} />
            <Route path="/fluxo-caixa" element={<CashFlow token={token} />} />
            <Route path="/financeiro" element={<Finance token={token} />} />
            <Route path="/configuracoes" element={<Settings token={token} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
