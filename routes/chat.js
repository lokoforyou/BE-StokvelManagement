const { OpenAI } = require('openai');

// Lazy initialization to ensure process.env is fully loaded
let _openai;
function getOpenAIClient() {
    if (!_openai) {
        if (!process.env.OPENROUTER_API_KEY) {
            console.error("CRITICAL ERROR: OPENROUTER_API_KEY is not defined in the environment.");
        }
        _openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        });
    }
    return _openai;
}

app.post('/api/chat', authenticateToken, async (req, res) => {
    const { message } = req.body;

    try {
        const openai = getOpenAIClient();
        if (!process.env.OPENROUTER_API_KEY) {
            throw new Error("OpenRouter API Key is missing. Please check your .env file.");
        }
        
        // 1. Gather context for the AI using Postgres async/await
        const userRes = await db.query('SELECT u.*, gm."groupId", gm.role FROM users u LEFT JOIN group_members gm ON u.id = gm."userId" WHERE u.id = $1', [req.user.id]);
        const user = userRes.rows[0];
        if (!user) return res.status(404).json({ error: "User not found" });

        const payRes = await db.query('SELECT * FROM payments WHERE "userId" = $1 ORDER BY date DESC LIMIT 5', [req.user.id]);
        const payments = payRes.rows;

        let groupContext = "";
        if (user.groupId) {
            const groupRes = await db.query('SELECT * FROM stokvel_groups WHERE id = $1', [user.groupId]);
            const group = groupRes.rows[0];
            
            const countRes = await db.query('SELECT COUNT(*) as count FROM group_members WHERE "groupId" = $1', [user.groupId]);
            const memberCount = countRes.rows[0].count;

            if (group) {
                groupContext = `Member of group: ${group.name}. Total Members: ${memberCount}. Group Balance: R${group.groupBalance}. Group Targets: Monthly R${group.monthlyTarget}, Yearly R${group.yearlyTarget}.`;
                
                // If user is Admin, add summary of other members' payments
                if (user.role === 'Admin') {
                    const allPaymentsRes = await db.query(
                        'SELECT u.name, p.amount, p.date, p.status FROM payments p JOIN users u ON p."userId" = u.id WHERE p."groupId" = $1 ORDER BY p.date DESC LIMIT 20',
                        [user.groupId]
                    );
                    const groupPayments = allPaymentsRes.rows;
                    groupContext += `\nGroup Payment History (Admin Only View): ${groupPayments.map(p => `${p.name}: R${p.amount} on ${p.date} (${p.status})`).join('; ')}`;
                }
            }
        }

        const systemPrompt = `You are "Stokvel Buddy", a professional and direct Stokvel Management Assistant. 
You are talking to ${user.name}.
Context:
- User Role: ${user.role || 'Member'}
- User Monthly Contribution: R${user.monthlyContribution}
- User Targets: Monthly R${user.monthlyTarget}, Yearly R${user.yearlyTarget}
- Your Recent Payments: ${payments.map(p => `R${p.amount} on ${p.date} (${p.status})`).join(', ')}
- ${groupContext}

Guidelines:
- BE EXTREMELY CONCISE. Give short, direct answers.
- Use a professional but helpful tone.
- Answer the specific question asked immediately.
- SECURITY: Only share individual payment details of OTHER members if the user's role is "Admin". If a regular member asks about someone else, politely decline.
- ALWAYS end your response by asking if the user wants different information, more details on the topic, or something related.
- Never give professional financial or legal advice.`;

        // 2. Call OpenRouter using the OpenAI SDK
        const response = await openai.chat.completions.create({
            model: "openai/gpt-oss-120b:free",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            extra_body: {
                reasoning: { enabled: true }
            }
        });

        const reply = response.choices[0].message.content;
        res.json({ reply });

    } catch (error) {
        console.error("Detailed Chat Error:", {
            message: error.message,
            stack: error.stack,
            type: error.constructor.name,
            details: error
        });
        res.status(500).json({ 
            error: "AI service unavailable",
            details: error.message
        });
    }
});
