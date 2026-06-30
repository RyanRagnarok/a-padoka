import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import Chart from 'react-apexcharts';

function Finance({ token }) {
  const [data, setData] = useState({ 
    gross_revenue: 0,
    total_taxas: 0,
    total_costs: 0,
    total_waste: 0,
    net_profit: 0,
    wasteByCategory: [],
    byMonth: [],
    byProduct: [],
    allProducts: [],
    byDay: [],
    byCategoryCost: [],
    byPaymentMethod: []
  });

  useEffect(() => {
    if (token) {
      apiFetch('/api/finance')
      .then(res => res.json())
      .then(resData => {
        if (resData.message) {
          console.error(resData.message);
          return;
        }
        setData(prevData => ({ ...prevData, ...resData }));
      })
      .catch(err => console.error(err));
    }
  }, [token]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // KPIs
  const isProfit = data.net_profit >= 0;

  // Chart 1: Receitas x Despesas (Linhas Duplas)
  const lineChartOptions = {
    chart: { type: 'line', toolbar: { show: false } },
    colors: ['#10B981', '#EF4444'], // Verde para Receita, Vermelho para Despesa
    stroke: { width: 3, curve: 'smooth' },
    xaxis: {
      categories: (data.byMonth || []).map(m => m.name),
    },
    yaxis: {
      labels: { formatter: (val) => formatCurrency(val) }
    },
    dataLabels: { enabled: false },
    legend: { position: 'top' },
    tooltip: {
      y: { formatter: (val) => formatCurrency(val) }
    }
  };
  const lineChartSeries = [
    { name: 'Receitas', data: (data.byMonth || []).map(m => m.receitas) },
    { name: 'Despesas', data: (data.byMonth || []).map(m => m.despesas) }
  ];

  // Chart 2: DRE Waterfall
  const waterfallOptions = {
    chart: { type: 'rangeBar', toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: false,
        isDumbbell: false,
        colors: {
          ranges: [
            { from: -1000000000, to: -0.01, color: '#EF4444' }, // Despesas
            { from: 0, to: 1000000000, color: '#10B981' }      // Entradas/Lucro
          ]
        }
      }
    },
    xaxis: { type: 'category' },
    yaxis: {
      labels: { formatter: (val) => formatCurrency(val) }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => formatCurrency(val[1] - val[0])
    },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
        const val = data.y[1] - data.y[0];
        return `<div style="padding: 10px;"><strong>${data.x}</strong><br/>${formatCurrency(val)}</div>`;
      }
    }
  };

  // Waterfall logic: Gross Revenue -> Costs -> Waste -> Net Profit
  let currentVal = data.gross_revenue;
  const waterfallData = [
    { x: 'Faturamento Bruto', y: [0, data.gross_revenue] }
  ];
  
  if (data.total_costs > 0) {
    waterfallData.push({ x: 'Custos', y: [currentVal, currentVal - data.total_costs] });
    currentVal -= data.total_costs;
  }
  
  if (data.total_waste > 0) {
    waterfallData.push({ x: 'Perdas', y: [currentVal, currentVal - data.total_waste] });
    currentVal -= data.total_waste;
  }
  
  waterfallData.push({ x: 'Lucro Líquido', y: [0, currentVal] }); // Result

  const waterfallSeries = [{ data: waterfallData }];

  // Chart 3: Top 10 Produtos
  const productOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    colors: ['#D2691E'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: (data.byProduct || []).map(p => p.name),
      labels: { formatter: (val) => formatCurrency(val) }
    },
    tooltip: {
      y: { formatter: (val) => formatCurrency(val) }
    }
  };
  const productSeries = [{ name: 'Vendas', data: (data.byProduct || []).map(p => p.value) }];

  // Chart 4: Top Perdas por Categoria
  const wasteOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    colors: ['#EF4444'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: (data.wasteByCategory || []).map(w => w.name),
      labels: { formatter: (val) => formatCurrency(val) }
    },
    tooltip: {
      y: { formatter: (val) => formatCurrency(val) }
    }
  };
  const wasteSeries = [{ name: 'Valor da Perda', data: (data.wasteByCategory || []).map(w => w.value) }];

  // Chart 5: Relação de Todos os Produtos Vendidos (Quantidade)
  const allProductsOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } } },
    colors: ['#F59E0B'],
    dataLabels: { 
      enabled: true, 
      textAnchor: 'start',
      style: { colors: ['#000'] },
      offsetX: 10
    },
    xaxis: {
      categories: (data.allProducts || []).map(p => p.name)
    },
    yaxis: {
      labels: { maxWidth: 300 }
    }
  };
  const allProductsSeries = [{ name: 'Unidades Vendidas', data: (data.allProducts || []).map(p => p.quantity) }];

  // Chart 6: Vendas Diárias
  const formatDailyDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    const options = { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('pt-BR', options); // Ex: "quarta-feira, 17/05/2026"
  };

  const dailyOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: '50%' } },
    colors: ['#3B82F6'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: (data.byDay || []).map(d => formatDailyDate(d.date)),
      labels: {
        rotate: -45,
        trim: true,
        style: { fontSize: '12px' }
      }
    },
    yaxis: {
      labels: { formatter: (val) => formatCurrency(val) }
    },
    tooltip: {
      y: { formatter: (val) => formatCurrency(val) }
    }
  };
  const dailySeries = [{ name: 'Faturamento', data: (data.byDay || []).map(d => d.total) }];

  // Chart 7: Custo Médio Teórico por Categoria
  const categoryCostOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: '50%' } },
    colors: ['#8B5CF6'], // Purple
    dataLabels: { enabled: true, formatter: (val) => formatCurrency(val) },
    xaxis: {
      categories: (data.byCategoryCost || []).map(c => c.name),
    },
    yaxis: {
      labels: { formatter: (val) => formatCurrency(val) }
    },
    tooltip: {
      y: { formatter: (val) => formatCurrency(val) }
    }
  };
  const categoryCostSeries = [{ name: 'Custo Médio (Ficha Técnica)', data: (data.byCategoryCost || []).map(c => c.cost) }];

  // Chart 8: Entradas por Canal (Payment Methods)
  const paymentMethodOptions = {
    chart: { type: 'donut' },
    labels: (data.byPaymentMethod || []).map(p => p.name),
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    tooltip: {
      y: { formatter: (val) => formatCurrency(val) }
    },
    dataLabels: {
      enabled: true,
      formatter: (val, opts) => {
        const name = opts.w.globals.labels[opts.seriesIndex];
        return `${name}`;
      }
    }
  };
  const paymentMethodSeries = (data.byPaymentMethod || []).map(p => p.value);

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: 'transparent', boxShadow: 'none', padding: '10px' }}>
      <h2 style={{ marginBottom: '30px' }}>📊 Dashboard Financeiro (DRE & KPIs)</h2>
      
      <div className="finance-kpis" style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
        
        {/* Card 1: Faturamento Bruto */}
        <div className="kpi-card" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flex: 1, minWidth: '250px' }}>
          <h3 style={{ margin: 0, color: '#666', fontSize: '1rem' }}>Faturamento Bruto</h3>
          <p style={{ margin: '10px 0 0', fontSize: '1.8rem', fontWeight: 'bold' }}>
            {formatCurrency(data.gross_revenue)}
          </p>
        </div>

        {/* Card 2: Taxas Retidas */}
        <div className="kpi-card" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flex: 1, minWidth: '250px', borderLeft: '4px solid #d9534f' }}>
          <h3 style={{ margin: 0, color: '#666', fontSize: '1rem' }}>Taxas de Maquininha</h3>
          <p style={{ margin: '10px 0 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#d9534f' }}>
            - {formatCurrency(data.total_taxas)}
          </p>
        </div>

        {/* Card 3: Receita Líquida */}
        <div className="kpi-card" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flex: 1, minWidth: '250px', borderLeft: '4px solid #28a745' }}>
          <h3 style={{ margin: 0, color: '#666', fontSize: '1rem' }}>Receita Líquida (Caixa)</h3>
          <p style={{ margin: '10px 0 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#28a745' }}>
            {formatCurrency(data.gross_revenue - data.total_taxas)}
          </p>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6B7280', fontWeight: '600' }}>Custos (Ingredientes)</h4>
          <h2 style={{ margin: 0, color: '#374151', fontSize: '2rem' }}>{formatCurrency(data.total_costs)}</h2>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6B7280', fontWeight: '600' }}>Desperdício / Perdas</h4>
          <h2 style={{ margin: 0, color: '#EF4444', fontSize: '2rem' }}>{formatCurrency(data.total_waste)}</h2>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '20px', borderTop: `6px solid ${isProfit ? '#10B981' : '#EF4444'}` }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6B7280', fontWeight: '600' }}>Lucro Líquido Real</h4>
          <h2 style={{ margin: 0, color: isProfit ? '#10B981' : '#EF4444', fontSize: '2.2rem' }}>{formatCurrency(data.net_profit)}</h2>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
        
        <div className="card">
          <h3 style={{ marginTop: 0, color: '#374151' }}>Evolução de Receitas x Despesas</h3>
          {data.byMonth.length < 2 ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
              Dados insuficientes para evolução histórica.
            </div>
          ) : (
            <Chart options={lineChartOptions} series={lineChartSeries} type="line" height={300} />
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, color: '#374151' }}>Entradas por Canal (Forma de Pagamento)</h3>
          {!(data.byPaymentMethod && data.byPaymentMethod.length > 0) ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Nenhuma venda registrada.</div>
          ) : (
            <Chart options={paymentMethodOptions} series={paymentMethodSeries} type="donut" height={300} />
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, color: '#374151' }}>Cascata (Waterfall) DRE</h3>
          <Chart options={waterfallOptions} series={waterfallSeries} type="rangeBar" height={300} />
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, color: '#374151' }}>Top 10 Produtos (Faturamento)</h3>
          {data.byProduct.length === 0 ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Nenhuma venda registrada.</div>
          ) : (
            <Chart options={productOptions} series={productSeries} type="bar" height={Math.max(300, data.byProduct.length * 40)} />
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, color: '#374151' }}>Top Perdas por Descrição</h3>
          {data.wasteByCategory.length === 0 ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Nenhuma perda registrada.</div>
          ) : (
            <Chart options={wasteOptions} series={wasteSeries} type="bar" height={Math.max(300, data.wasteByCategory.length * 40)} />
          )}
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>Relação de Todos os Produtos (Unidades Vendidas)</h3>
          {!(data.allProducts && data.allProducts.length > 0) ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Nenhuma venda registrada.</div>
          ) : (
            <Chart options={allProductsOptions} series={allProductsSeries} type="bar" height={Math.max(400, data.allProducts.length * 40)} />
          )}
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>Faturamento Diário</h3>
          {!(data.byDay && data.byDay.length > 0) ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Nenhuma venda registrada.</div>
          ) : (
            <Chart options={dailyOptions} series={dailySeries} type="bar" height={400} />
          )}
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>Custo Médio por Categoria (Ficha Técnica)</h3>
          {!(data.byCategoryCost && data.byCategoryCost.length > 0) ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Nenhuma ficha técnica registrada.</div>
          ) : (
            <Chart options={categoryCostOptions} series={categoryCostSeries} type="bar" height={300} />
          )}
        </div>

      </div>
    </div>
  );
}

export default Finance;
