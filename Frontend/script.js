// Mantener activo el backend
fetch(`${BACKEND_URL}/wake-up`)
  .catch(() => console.log("Activando backend..."));

const formulario = document.getElementById('formulario');
const selectorCosto = document.getElementById('modoCosto');
const labelCosto = document.getElementById('labelCosto');
const resultadoDiv = document.getElementById('resultado');

// URL del backend (ajustar según necesidad)
const BACKEND_URL = "https://rentabilidad.onrender.com" || 'http://localhost:5000/api';


// Constantes para los porcentajes (deben coincidir con el backend)
const PORCENTAJE_IMPUESTOS = 0.21;
const PORCENTAJE_PLATAFORMA = 0.13;
const PORCENTAJE_MARKETING = 0.10;
const MARGEN_GANANCIA = 0.05;
const GASTOS_ENVIO_DEFAULT = 0;

// Inicializar el label al cargar
actualizarLabelCosto();

// EVENTOS
selectorCosto.addEventListener('change', actualizarLabelCosto);
formulario.addEventListener('submit', manejarSubmit);

function actualizarLabelCosto() {
  labelCosto.textContent = selectorCosto.value === 'unidad' 
    ? 'Costo por Unidad *' 
    : 'Costo por Lote *';
}

async function manejarSubmit(event) {
    event.preventDefault();
    resultadoDiv.innerHTML = '';
    
    const nombreProducto = document.getElementById('nombreProducto').value.trim();
    const cantidad = parseFloat(document.getElementById('cantidad').value);
    const modoCosto = selectorCosto.value;
    const costo = parseFloat(document.getElementById('costo').value);
    const gastosEnvio = parseFloat(document.getElementById('gastosEnvio').value) || GASTOS_ENVIO_DEFAULT;
    
    if (!validarEntradas(nombreProducto, cantidad, costo)) {
        return;
    }
    
    mostrarSpinner();
    
    try {
        // Enviar solicitud al backend
        const response = await fetch(`${BACKEND_URL}/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productName: nombreProducto,
                cost: costo,
                shippingCost: gastosEnvio,
                quantity: cantidad,
                costType: modoCosto
            })
        });
        
        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en el servidor');
        }
        
        // Obtener los datos de la respuesta
        const data = await response.json();
        
        // Mostrar resultados según la viabilidad
        if (!data.viable) {
            mostrarNoViable(data);
        } else {
            mostrarResultadosFinales(data);
        }
        
    } catch (error) {
        mostrarError(`Error: ${error.message}`);
    }
}

function validarEntradas(nombreProducto, cantidad, costo) {
  if (!nombreProducto || nombreProducto.length < 3) {
    mostrarError('Ingrese un nombre válido (mín. 3 caracteres)');
    return false;
  }

  if (isNaN(cantidad) || cantidad <= 0) {
    mostrarError('Ingrese una cantidad válida (mayor a 0)');
    return false;
  }

  if (isNaN(costo) || costo <= 0) {
    mostrarError('Ingrese un costo válido (mayor a 0)');
    return false;
  }

  return true;
}

function mostrarSpinner() {
  resultadoDiv.innerHTML = '<div class="spinner"></div>';
}

function mostrarError(mensaje) {
    resultadoDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> ${mensaje}</div>`;
}

function mostrarNoViable(data) {
    const porcentajeCosto = data.pml 
        ? (data.minSellingPrice / data.pml * 100).toFixed(1) 
        : 'N/A';
    
    resultadoDiv.innerHTML = `
        <div class="warning">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>¡Producto no rentable!</h2>
            
            <div class="datos-viabilidad">
                <p><strong>Costo por unidad:</strong> $${data.unitCost.toFixed(2)}</p>
                <p><strong>Gastos de envío:</strong> $${data.shippingCost.toFixed(2)}</p>
                <p><strong>Precio mínimo requerido:</strong> $${data.minSellingPrice.toFixed(2)}</p>
                ${data.pml ? `<p><strong>PML (Precio Mercado Libre):</strong> $${data.pml.toFixed(2)}</p>` : ''}
                ${data.pml ? `<p><strong>Relación:</strong> El precio mínimo es ${porcentajeCosto}% del PML</p>` : ''}
            </div>
            
            <div class="analisis-markup">
                <h3>Análisis de Rentabilidad:</h3>
                <ul>
                    <li>Margen total requerido: ${(data.requiredMargin * 100).toFixed(2)}%</li>
                    <li>Markup mínimo: ${(data.minMarkup * 100).toFixed(2)}%</li>
                    <li>Fórmula: Precio mínimo = (Costo × (1 + Markup)) + Gastos de envío</li>
                </ul>
            </div>
            
            <div class="recomendacion">
                <h3>Recomendaciones:</h3>
                <ul>
                    <li>Negocia costos más bajos con proveedores</li>
                    <li>Busca alternativas de logística más económicas</li>
                    <li>Reconsidera tu margen de ganancia mínimo</li>
                    <li>Evalúa si el producto tiene suficiente valor agregado</li>
                </ul>
            </div>
        </div>
    `;
}

function mostrarResultadosFinales(data) {
    const { unitCost, shippingCost, suggestedPrice, pml, minSellingPrice, minMarkup, requiredMargin, breakdown } = data;
    
    let origenPrecio = '';
    if (pml) {
        origenPrecio = `<p class="origen-precio"><i class="fas fa-chart-line"></i> Precio basado en competencia: $${pml.toFixed(2)}</p>`;
    } else {
        origenPrecio = `<p class="origen-precio"><i class="fas fa-calculator"></i> Precio calculado con margen mínimo garantizado</p>`;
    }
    
    resultadoDiv.innerHTML = `
        <div class="resultado">
            <h2>Resultados para: ${data.productName}</h2>
            
            <div class="datos-principales">
                <p><i class="fas fa-tag"></i> <strong>Costo por unidad:</strong> $${unitCost.toFixed(2)}</p>
                <p><i class="fas fa-truck"></i> <strong>Gastos de envío:</strong> $${shippingCost.toFixed(2)}</p>
                <p><i class="fas fa-dollar-sign"></i> <strong>Precio sugerido:</strong> $${suggestedPrice.toFixed(2)}</p>
                <p><i class="fas fa-calculator"></i> <strong>Precio mínimo requerido:</strong> $${minSellingPrice.toFixed(2)}</p>
                ${origenPrecio}
            </div>
            
            <div class="analisis-markup">
                <h3><i class="fas fa-calculator"></i> Cálculo de Rentabilidad:</h3>
                <ul>
                    <li>Margen total requerido: ${(requiredMargin * 100).toFixed(2)}%</li>
                    <li>Markup mínimo aplicado: ${(minMarkup * 100).toFixed(2)}%</li>
                    <li>Fórmula: ($${unitCost.toFixed(2)} × ${(1 + minMarkup).toFixed(2)}) + $${shippingCost.toFixed(2)}</li>
                </ul>
            </div>
            
            <div class="desglose">
                <h3><i class="fas fa-receipt"></i> Desglose del precio sugerido:</h3>
                <ul>
                    <li>Impuestos (${(PORCENTAJE_IMPUESTOS * 100).toFixed(0)}%): <span>$${breakdown.taxes.toFixed(2)}</span></li>
                    <li>Comisión plataforma (${(PORCENTAJE_PLATAFORMA * 100).toFixed(0)}%): <span>$${breakdown.platformFee.toFixed(2)}</span></li>
                    <li>Marketing (${(PORCENTAJE_MARKETING * 100).toFixed(0)}%): <span>$${breakdown.marketing.toFixed(2)}</span></li>
                    <li>Ganancia (${(MARGEN_GANANCIA * 100).toFixed(0)}%): <span>$${breakdown.profit.toFixed(2)}</span></li>
                    <li>Envío: <span>$${breakdown.shipping.toFixed(2)}</span></li>
                </ul>
            </div>
            
            <div class="nota">
                <i class="fas fa-info-circle"></i> El precio sugerido garantiza un margen mínimo del ${(MARGEN_GANANCIA * 100).toFixed(0)}% después de todos los costos
            </div>
        </div>
    `;
}