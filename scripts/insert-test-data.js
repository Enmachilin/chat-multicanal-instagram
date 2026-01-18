// Script simplificado para insertar datos de prueba
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCSeledBCSqyd7I
qTzjclARFFG5jmFfdOOOgPLPpiNfbM3DHIM0dJNWB9laPaa7X8JrVZlkw0on0Vno
7GhbjVXt1rhH2gnD016rj3YNyxX6GA1I1gnfhBRf+tV1bV2LOSk8QqRJJgwtfi2l
d4vTWSM7nLWdMRjTujeHrvS4Cy1IL228bP4h3ku/A5s12ulWf2nougBDyP+zMWfI
1e5xeMfKVmw8glkgjeVyUIwfYgUkeVqXmQ2T14WmZLzfd4EYl95xON9Fj0bG4us2
y64cb40TLcf3qh6XWZbTqTL4tuICj/aGppaF9pqIrq00sQAQ3hQeIdmzEmHZuJiD
utcD5aM7AgMBAAECggEAN1/P0liYIgap1bMBBT0YXrSPRrY4QnV2d09xO6XjlnYT
/XBAe6qcbngOJ6rJ5ukHHzuffzPCy3W95yvEMeQm+YBkbylS6rh0ACh+aS1+0+qW
zxO3bMvKRhSV8MwVAoZr+893uv2KugIK8JRWhGIcyzLth4zhhV1PE9jEw/TZvAE7
qgFKXZqbd/CIdhD4AHZyf2em05gOYLzgvS7L/S7EcreIrGUqCB+e1k7HkxnLV5Mm
EBbRsdUFgU5nJfk3d7rkUU5CYlz05cDqlfttniQptw1utueKEIbI9oaywnxHSnU3
H7rIicIKjT4XCR5aYestj8rRKBMc9cl9rjCd8hHLAQKBgQDFozv8+xrO9XEi0uL8
LBax3oeklgRE3PGjzuylIljJ7HaVGTO/2yUqrAE9hPZya0uY2daQ7QyNezkDLrM9
A0vXbCcoCrwv1mHfAlqs/iDprN8woQlcHC+jQzra/tabd1bmS3u6+hGVbpaBP1Fy
gMWEAcTroyK4FwO4sTg7kawJAQKBgQC9u5j1d1QiqhFFJTB/a/yTi8NfCiEa8b3z
JQ+FZPs4mTKbbj35WPulkT1IX69Qw+4a+6t6YHM9lLdNFsifMBytSwGBvaeh4zE1
N3v6DM+VJ1ZjwO3XtYpfN+HtrkfvuFtA9gwUIN3ka+sWPfJdy/f6i0LLLgxeBGCI
g3dpBS+QOwKBgEq/0Ul+Y4ZRGGg2YLlFp5PAeYcLYjP1aMMu2Rwf4HsGn1cHACaZ
KPZ5tcJhzqA56o62HUwVDAFa0JZejFYQMBgbBLhFTyW8rKmfB1KUjzgyNPv8fEDF
PFNAczsu1VZZjZluhS6TtCDTgcMCgriO8aVa0fLZcaE0uyiYho8pKmsBAoGBAI7j
VVKnx4lDozX7yAZugQ1tWHme20e7f146LvI7FqeNWHuODsZWqU4Lj6eNyC5/IDba
Ck5jjOZ3tYQtAHJCfZZUwpG/DxvwSgLWAlxSgZLGyVze00B8y/Th1Rh3BF4Y7UCD
DJ2sEvAQBj/97yWMkvjxICB8UXwMt9aXi7pf2W45AoGAQSfU82QStgaFa0ZiwsO0
N/NBH6thg/kEGRwl5K103WDFaXgqNzn0ZP762SoZEgcxthdmR7I5LJFWwm+j+kjy
ZQk6Db3/tDd5dhpulZpe2xY9okRU36BHZK0nf88ABqo8Sn36SYhaKvWbHdpmgg8M
WaP38p10Pc4CXUCOjIZKeuA=
-----END PRIVATE KEY-----`;

// Initialize Firebase Admin
const app = initializeApp({
    credential: cert({
        projectId: 'chatmulticanal',
        clientEmail: 'firebase-adminsdk-fbsvc@chatmulticanal.iam.gserviceaccount.com',
        privateKey: privateKey,
    }),
});

const db = getFirestore(app);

async function insertTestData() {
    try {
        console.log('Insertando datos de prueba...\n');

        const now = Timestamp.now();

        // Test comment 1
        await db.collection('instagram_comments').doc('test_comment_1').set({
            id: 'test_comment_1',
            type: 'comment',
            text: '¡Hola! ¿Cuál es el PRECIO de este producto?',
            mediaId: 'test_media_123',
            from: {
                id: 'test_user_1',
                username: 'cliente_prueba',
            },
            igAccountId: 'test_account',
            replied: false,
            createdAt: now,
            receivedAt: now,
        });
        console.log('✅ Comentario 1 insertado');

        // Test comment 2
        await db.collection('instagram_comments').doc('test_comment_2').set({
            id: 'test_comment_2',
            type: 'comment',
            text: 'Me encanta este diseño 😍',
            mediaId: 'test_media_456',
            from: {
                id: 'test_user_2',
                username: 'diseño_lover',
            },
            igAccountId: 'test_account',
            replied: true,
            createdAt: now,
            receivedAt: now,
        });
        console.log('✅ Comentario 2 insertado');

        // Test DM conversation
        const conversationId = 'test_account_test_user_dm';
        await db.collection('instagram_conversations').doc(conversationId).set({
            igAccountId: 'test_account',
            participantId: 'test_user_dm',
            lastMessage: {
                text: 'Hola, tengo una pregunta sobre el envío',
                fromUs: false,
            },
            unreadCount: 1,
            updatedAt: now,
        });
        console.log('✅ Conversación DM insertada');

        // Test DM message
        await db.collection('instagram_messages').doc('test_dm_1').set({
            id: 'test_dm_1',
            type: 'dm',
            text: 'Hola, tengo una pregunta sobre el envío',
            from: {
                id: 'test_user_dm',
            },
            igAccountId: 'test_account',
            replied: false,
            createdAt: now,
            receivedAt: now,
        });
        console.log('✅ Mensaje DM insertado');

        console.log('\n🎉 ¡Datos de prueba insertados correctamente!');
        console.log('Refresca tu dashboard para verlos.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

insertTestData();
