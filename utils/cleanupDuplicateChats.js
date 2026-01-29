/**
 * Script de limpieza de chats duplicados
 * 
 * Este script identifica y elimina chats duplicados que se crearon
 * debido al bug de continuidad de chat.
 * 
 * Criterio de duplicado:
 * - Mismo userId
 * - Mismo título (o títulos muy similares)
 * - Creados en un período corto de tiempo
 * 
 * Estrategia:
 * - Agrupa chats por userId y título
 * - Mantiene el chat con más mensajes
 * - Elimina los demás
 */

const { Chat, Message } = require('../models');

async function cleanupDuplicateChats() {
    try {
        console.log('🧹 Iniciando limpieza de chats duplicados...\n');

        // Obtener todos los chats con sus mensajes
        const chats = await Chat.findAll({
            include: [{
                model: Message,
                as: 'messages'
            }],
            order: [['createdAt', 'DESC']]
        });

        console.log(`📊 Total de chats encontrados: ${chats.length}\n`);

        // Agrupar chats por userId y título
        const chatGroups = {};

        chats.forEach(chat => {
            const key = `${chat.user_id}_${chat.title}`;
            if (!chatGroups[key]) {
                chatGroups[key] = [];
            }
            chatGroups[key].push(chat);
        });

        let duplicatesFound = 0;
        let chatsDeleted = 0;

        // Procesar cada grupo
        for (const [key, group] of Object.entries(chatGroups)) {
            if (group.length > 1) {
                duplicatesFound++;
                console.log(`\n🔍 Grupo duplicado encontrado: "${group[0].title}"`);
                console.log(`   Cantidad de duplicados: ${group.length}`);

                // Ordenar por cantidad de mensajes (descendente)
                group.sort((a, b) => {
                    const aMessages = a.messages ? a.messages.length : 0;
                    const bMessages = b.messages ? b.messages.length : 0;
                    return bMessages - aMessages;
                });

                // Mantener el primero (con más mensajes), eliminar el resto
                const toKeep = group[0];
                const toDelete = group.slice(1);

                console.log(`   ✅ Manteniendo chat ID ${toKeep.id} (${toKeep.messages ? toKeep.messages.length : 0} mensajes)`);

                for (const chat of toDelete) {
                    console.log(`   ❌ Eliminando chat ID ${chat.id} (${chat.messages ? chat.messages.length : 0} mensajes)`);

                    // Eliminar mensajes asociados primero
                    await Message.destroy({
                        where: { chat_id: chat.id }
                    });

                    // Eliminar el chat
                    await chat.destroy();
                    chatsDeleted++;
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📈 Resumen de limpieza:');
        console.log(`   - Grupos duplicados encontrados: ${duplicatesFound}`);
        console.log(`   - Chats eliminados: ${chatsDeleted}`);
        console.log(`   - Chats restantes: ${chats.length - chatsDeleted}`);
        console.log('='.repeat(50) + '\n');

        console.log('✅ Limpieza completada exitosamente!');

    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    cleanupDuplicateChats()
        .then(() => {
            console.log('\n✨ Script finalizado. Puedes cerrar esta ventana.');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Error fatal:', error);
            process.exit(1);
        });
}

module.exports = { cleanupDuplicateChats };
