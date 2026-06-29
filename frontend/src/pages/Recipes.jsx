import React, { useState, useEffect } from 'react';
import Select from 'react-select';

function Recipes({ token }) {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Recipe form
  const [recipeItems, setRecipeItems] = useState([]);
  const [totalCost, setTotalCost] = useState(0);

  // New Ingredient form
  const [newIng, setNewIng] = useState({ name: '', unit: 'un', cost_per_unit: '' });

  useEffect(() => {
    fetchProducts();
    fetchIngredients();
  }, [token]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchIngredients = async () => {
    try {
      const res = await fetch('/api/ingredientes', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setIngredients(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFichaTecnica = async (productId) => {
    try {
      const res = await fetch(`/api/products/${productId}/ficha-tecnica`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setRecipeItems(data.ingredients);
      setTotalCost(data.total_cost);
    } catch (e) {
      console.error(e);
    }
  };

  const handleProductSelect = (selectedOption) => {
    if (selectedOption) {
      const product = products.find(p => p.id === selectedOption.value);
      setSelectedProduct(product);
      fetchFichaTecnica(product.id);
    } else {
      setSelectedProduct(null);
      setRecipeItems([]);
      setTotalCost(0);
    }
  };

  const handleAddIngredientToRecipe = (selectedOption) => {
    if (!selectedOption) return;
    const ingId = selectedOption.value;
    const ing = ingredients.find(i => i.id === ingId);
    if (recipeItems.find(i => i.ingredient_id === ingId)) {
      alert("Ingrediente já adicionado.");
      return;
    }
    setRecipeItems([...recipeItems, { ingredient_id: ingId, ingredient_name: ing.name, unit: ing.unit, cost_per_unit: ing.cost_per_unit, quantity: 1 }]);
  };

  const handleQuantityChange = (index, qty) => {
    const updated = [...recipeItems];
    updated[index].quantity = qty;
    setRecipeItems(updated);
  };

  const handleRemoveIngredient = (index) => {
    const updated = [...recipeItems];
    updated.splice(index, 1);
    setRecipeItems(updated);
  };

  const saveFichaTecnica = async () => {
    if (!selectedProduct) return;
    try {
      await fetch(`/api/products/${selectedProduct.id}/ficha-tecnica`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ingredients: recipeItems })
      });
      alert('Ficha Técnica salva com sucesso!');
      fetchFichaTecnica(selectedProduct.id);
    } catch (e) {
      console.error(e);
    }
  };

  const saveNewIngredient = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/ingredientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newIng)
      });
      setNewIng({ name: '', unit: 'un', cost_per_unit: '' });
      fetchIngredients();
      alert('Ingrediente criado!');
    } catch (e) {
      console.error(e);
    }
  };

  const productOptions = products.map(p => ({ value: p.id, label: p.name }));
  const ingredientOptions = ingredients.map(i => ({ value: i.id, label: `${i.name} (${i.unit}) - R$ ${i.cost_per_unit}` }));

  // Calcular custo dinamico da tela
  const currentTotalCost = recipeItems.reduce((acc, curr) => acc + (parseFloat(curr.quantity || 0) * parseFloat(curr.cost_per_unit)), 0);

  return (
    <div className="recipes-container">
      <h2>Receitas & Ficha Técnica</h2>

      <div className="recipes-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div className="card">
          <h3>Gestão de Ficha Técnica</h3>
          <div className="form-group">
            <label>Selecione o Produto</label>
            <Select 
              options={productOptions} 
              onChange={handleProductSelect}
              isClearable
              placeholder="Buscar Produto..."
            />
          </div>

          {selectedProduct && (
            <div className="ficha-tecnica-editor" style={{marginTop: '20px'}}>
              <h4>Ficha Técnica: {selectedProduct.name}</h4>
              
              <div className="form-group">
                <label>Adicionar Ingrediente</label>
                <Select 
                  options={ingredientOptions}
                  onChange={handleAddIngredientToRecipe}
                  value={null}
                  placeholder="Buscar Ingrediente..."
                />
              </div>

              <table className="data-table" style={{marginTop: '10px', width: '100%'}}>
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Qtd</th>
                    <th>Unid.</th>
                    <th>Custo/Unid</th>
                    <th>Subtotal</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {recipeItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.ingredient_name}</td>
                      <td>
                        <input 
                          type="number" 
                          step="0.001" 
                          value={item.quantity} 
                          onChange={(e) => handleQuantityChange(index, e.target.value)} 
                          style={{width: '80px', padding: '5px'}}
                        />
                      </td>
                      <td>{item.unit}</td>
                      <td>R$ {parseFloat(item.cost_per_unit).toFixed(2)}</td>
                      <td>R$ {(parseFloat(item.quantity || 0) * parseFloat(item.cost_per_unit)).toFixed(2)}</td>
                      <td><button className="btn-delete" onClick={() => handleRemoveIngredient(index)}>Remover</button></td>
                    </tr>
                  ))}
                  {recipeItems.length === 0 && (
                    <tr><td colSpan="6" style={{textAlign: 'center'}}>Nenhum ingrediente adicionado.</td></tr>
                  )}
                </tbody>
              </table>

              <div style={{marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <strong>Custo Total da Receita: </strong> R$ {currentTotalCost.toFixed(2)}
                  <br />
                  <strong>Preço de Venda: </strong> R$ {parseFloat(selectedProduct.price).toFixed(2)}
                  <br />
                  <strong>Margem Bruta (Teórica): </strong> 
                  {selectedProduct.price > 0 ? (((selectedProduct.price - currentTotalCost) / selectedProduct.price) * 100).toFixed(1) : 0}%
                </div>
                <button className="btn-primary" onClick={saveFichaTecnica}>Salvar Ficha Técnica</button>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Cadastrar Ingrediente Base</h3>
          <form onSubmit={saveNewIngredient}>
            <div className="form-group">
              <label>Nome do Ingrediente</label>
              <input type="text" value={newIng.name} onChange={e => setNewIng({...newIng, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Unidade de Medida</label>
              <select value={newIng.unit} onChange={e => setNewIng({...newIng, unit: e.target.value})} required>
                <option value="kg">Quilograma (kg)</option>
                <option value="g">Grama (g)</option>
                <option value="l">Litro (l)</option>
                <option value="ml">Mililitro (ml)</option>
                <option value="un">Unidade (un)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Custo por Unidade (R$)</label>
              <input type="number" step="0.01" value={newIng.cost_per_unit} onChange={e => setNewIng({...newIng, cost_per_unit: e.target.value})} required />
              <small style={{color: '#666'}}>Ex: Se comprou 5kg por R$ 25, o custo por kg é 5.00.</small>
            </div>
            <button type="submit" className="btn-primary" style={{marginTop: '10px'}}>Cadastrar Ingrediente</button>
          </form>

          <h4 style={{marginTop: '20px'}}>Ingredientes Cadastrados</h4>
          <div style={{maxHeight: '300px', overflowY: 'auto'}}>
            <table className="data-table" style={{width: '100%'}}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Medida</th>
                  <th>Custo</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map(i => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td>{i.unit}</td>
                    <td>R$ {parseFloat(i.cost_per_unit).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Recipes;
