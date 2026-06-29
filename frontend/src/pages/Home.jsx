import { apiFetch } from '../utils/api';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <>
      <header className="header">
        <h1>🍞 A Padoka</h1>
        <p>Bem-vindo ao sistema de pedidos, Bruna e Ryan!</p>
      </header>
      <main className="main-content">
        <div className="card">
          <h2>📦 Pedidos</h2>
          <p>Área para registrar novas vendas.</p>
          <Link to="/pedidos" className="btn btn-secondary">Acessar</Link>
        </div>
        <div className="card">
          <h2>👥 Clientes</h2>
          <p>Cadastro de clientes.</p>
          <Link to="/clientes" className="btn btn-secondary">Acessar</Link>
        </div>
        <div className="card">
          <h2>🥐 Produtos</h2>
          <p>Cadastro do cardápio.</p>
          <Link to="/produtos" className="btn btn-secondary">Acessar</Link>
        </div>
        <div className="card">
          <h2>📈 Financeiro</h2>
          <p>Dashboard de faturamento.</p>
          <Link to="/financeiro" className="btn btn-secondary">Acessar</Link>
        </div>
      </main>
    </>
  );
}

export default Home;
