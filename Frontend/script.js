// ================= CONFIGURACIÓN INICIAL =================
// Determinar si estamos en local
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Definir la URL del backend
const BACKEND_URL = isLocal 
  ? 'http://localhost:5000/api' 
  : 'https://rentabilidad.onrender.com/api';

// Mantener activo el backend
fetch(`${BACKEND_URL}/wake-up`)
  .then(response => response.json())
  .then(data => console.log("Backend activo:", data))
  .catch(() => console.log("Activando backend..."));

// ================= OAUTH MERCADO LIBRE =================
window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    mostrarSpinner();
    try {
      // Recuperar el code_verifier
      const code_verifier = sessionStorage.getItem('ml_code_verifier');
      if (!code_verifier) {
        mostrarError('No se encontró el code_verifier. Intenta conectar nuevamente.');
        return;
      }
      const resp = await fetch(`${BACKEND_URL}/mercadolibre/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_verifier })
      });
      if (!resp.ok) {
        const err = await resp.json();
        mostrarError('Error autenticando con Mercado Libre: ' + (err.error || ''));
      } else {
        mostrarError('¡Conexión con Mercado Libre exitosa!');
        setTimeout(() => {
          window.location.href = window.location.pathname;
        }, 1500);
      }
    } catch (e) {
      mostrarError('Error de red autenticando con Mercado Libre');
    }
  }
});

// ================= PKCE UTILS =================
function generateRandomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < array.length; i++) {
    result += charset[array[i] % charset.length];
  }
  return result;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

function base64UrlEncode(arrayBuffer) {
  let str = '';
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function pkceChallengeFromVerifier(verifier) {
  const hashed = await sha256(verifier);
  return base64UrlEncode(hashed);
}

async function conectarMercadoLibre() {
  mostrarSpinner();
  try {
    // 1. Generar code_verifier y code_challenge
    const code_verifier = generateRandomString(64);
    sessionStorage.setItem('ml_code_verifier', code_verifier);
    const code_challenge = await pkceChallengeFromVerifier(code_verifier);

    // 2. Pedir la URL de autorización al backend (enviar el challenge)
    const resp = await fetch(`${BACKEND_URL}/mercadolibre/auth-url?code_challenge=${code_challenge}`);
    const data = await resp.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      mostrarError('No se pudo obtener la URL de Mercado Libre');
    }
  } catch (e) {
    mostrarError('Error de red obteniendo URL de Mercado Libre');
  }
}

function mostrarBotonConectarML() {
  resultadoDiv.innerHTML = `
    <div class="error">
      <i class="fas fa-exclamation-circle"></i> Es necesario conectar con Mercado Libre para continuar.<br>
      <button onclick="conectarMercadoLibre()" class="btn-calculate" style="margin-top:10px;">
        <i class="fab fa-mercadolibre"></i> Conectar con Mercado Libre
      </button>
    </div>
  `;
}

// ================= ELEMENTOS DEL FORMULARIO =================
const formulario = document.getElementById('formulario');
const selectorCosto = document.getElementById('modoCosto');
const labelCosto = document.getElementById('labelCosto');
const resultadoDiv = document.getElementById('resultado');

// Constantes para los porcentajes (deben coincidir con el backend)
const PORCENTAJE_IMPUESTOS = 0.21;
const PORCENTAJE_PLATAFORMA = 0.13;
const PORCENTAJE_MARKETING = 0.10;
const MARGEN_GANANCIA = 0.05;
const GASTOS_ENVIO_DEFAULT = 0;

// ================= INICIALIZACIÓN =================
// Inicializar el label al cargar
actualizarLabelCosto();

// ================= EVENTOS =================
selectorCosto.addEventListener('change', actualizarLabelCosto);
formulario.addEventListener('submit', manejarSubmit);

// ================= FUNCIONES =================
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
            // Si el error es de autenticación de Mercado Libre, mostrar botón
            const errMsg = (errorData.error || '').toLowerCase();
            if (errMsg.includes('mercado libre') || errMsg.includes('access_token') || errMsg.includes('autenticar')) {
                mostrarBotonConectarML();
                return;
            }
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