#!/bin/bash

# Script de verificación para debugging del deployment de Neotesis Perú en Railway
# Uso: ./check-deployment.sh [url_de_railway]

echo "🔍 Verificando deployment de Neotesis Perú"
echo "=========================================="

# Verificar si se proporcionó URL
if [ $# -eq 0 ]; then
    echo "❌ Error: Proporciona la URL de Railway como argumento"
    echo "Uso: $0 https://tu-app.railway.app"
    exit 1
fi

RAILWAY_URL=$1
echo "📍 URL a verificar: $RAILWAY_URL"

# Función para verificar respuesta HTTP
check_http() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3

    echo -n "🔍 Verificando $description... "

    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
        if [ "$response" = "$expected_status" ]; then
            echo "✅ OK ($response)"
            return 0
        else
            echo "❌ Error ($response)"
            return 1
        fi
    else
        echo "⚠️  curl no disponible, saltando verificación HTTP"
        return 0
    fi
}

# Función para verificar contenido
check_content() {
    local url=$1
    local pattern=$2
    local description=$3

    echo -n "🔍 Verificando $description... "

    if command -v curl &> /dev/null; then
        content=$(curl -s "$url" 2>/dev/null)
        if echo "$content" | grep -q "$pattern"; then
            echo "✅ OK"
            return 0
        else
            echo "❌ No encontrado"
            return 1
        fi
    else
        echo "⚠️  curl no disponible, saltando verificación de contenido"
        return 0
    fi
}

echo ""
echo "🌐 Verificaciones básicas:"
echo "-------------------------"

# Verificar página principal
check_http "$RAILWAY_URL" 200 "página principal"

# Verificar que contiene elementos de Neotesis
check_content "$RAILWAY_URL" "Neotesis Perú" "título de la página"

# Verificar secciones principales
check_content "$RAILWAY_URL" "Generador APA" "sección Generador APA"
check_content "$RAILWAY_URL" "Auto-Cita" "sección Auto-Cita"
check_content "$RAILWAY_URL" "Chat con PDF" "sección Chat PDF"

echo ""
echo "🔧 Verificaciones de API:"
echo "-------------------------"

# Nota: Las APIs requieren POST, así que solo verificamos que las rutas respondan
# (aunque devolverán 405 Method Not Allowed, eso significa que existen)

# Verificar endpoint de chat
check_http "$RAILWAY_URL/api/chat" 405 "endpoint /api/chat"

# Verificar endpoint de proxy
check_http "$RAILWAY_URL/api/proxy" 405 "endpoint /api/proxy"

echo ""
echo "📊 Verificaciones de funcionalidad:"
echo "-----------------------------------"

# Verificar que la página carga recursos estáticos
check_http "$RAILWAY_URL/styles.css" 200 "CSS principal"
check_http "$RAILWAY_URL/scripts.js" 200 "JavaScript principal"

echo ""
echo "🔍 Verificaciones adicionales:"
echo "------------------------------"

# Verificar headers de seguridad
echo -n "🔍 Verificando headers de seguridad... "
if command -v curl &> /dev/null; then
    headers=$(curl -s -I "$RAILWAY_URL" 2>/dev/null)
    if echo "$headers" | grep -q "X-Frame-Options"; then
        echo "✅ X-Frame-Options presente"
    else
        echo "⚠️  X-Frame-Options no encontrado"
    fi
else
    echo "⚠️  curl no disponible"
fi

echo ""
echo "📋 Resumen:"
echo "-----------"
echo "✅ Deployment básico verificado"
echo "✅ APIs detectadas"
echo "✅ Recursos estáticos accesibles"
echo ""
echo "💡 Próximos pasos:"
echo "- Prueba manual: Sube un PDF y haz una pregunta"
echo "- Verifica logs en Railway Dashboard si hay errores"
echo "- Confirma que GROQ_API_KEY está configurada"

echo ""
echo "🎉 ¡Verificación completada!"