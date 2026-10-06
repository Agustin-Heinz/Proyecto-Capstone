require('dotenv').config();

async function listarModelos() {
  console.log("🔍 Consultando los servidores de Google...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
  
  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    
    if (datos.error) {
       console.error("❌ Error de la llave API:", datos.error.message);
       return;
    }

    console.log("✅ Modelos compatibles y habilitados para tu API Key:");
    datos.models.forEach(m => {
      // Filtramos solo los que son Gemini y sirven para chatear
      if (m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent')) {
        // Le quitamos la palabra "models/" para que lo copies limpio
        console.log(`👉 ${m.name.replace('models/', '')}`);
      }
    });
  } catch (error) {
    console.error("Error de conexión:", error);
  }
}

listarModelos();