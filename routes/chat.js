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
        // 1. Gather context for the AI
        const user = await new Promise((resolve) => {
            db.get('SELECT u.*, gm.groupId, gm.role FROM users u LEFT JOIN group_members gm ON u.id = gm.userId WHERE u.id = ?', [req.user.id], (err, row) => resolve(row));
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        const payments = await new Promise((resolve) => {
            db.all('SELECT * FROM payments WHERE userId = ? ORDER BY date DESC LIMIT 5', [req.user.id], (err, rows) => resolve(rows || []));
        });

        let groupContext = "";
        if (user.groupId) {
            const group = await new Promise((resolve) => {
                db.get('SELECT * FROM stokvel_groups WHERE id = ?', [user.groupId], (err, row) => resolve(row));
            });
            if (group) {
                groupContext = `Member of group: ${group.name}. Group Balance: R${group.groupBalance}. Group Targets: Monthly R${group.monthlyTarget}, Yearly R${group.yearlyTarget}.`;
            }
        }

        const systemPrompt = `You are "Stokvel Buddy", a professional and direct Stokvel Management Assistant. 
You are talking to ${user.name}.
Context:
- User Role: ${user.role || 'Member'}
- User Monthly Contribution: R${user.monthlyContribution}
- User Targets: Monthly R${user.monthlyTarget}, Yearly R${user.yearlyTarget}
- Recent Payments: ${payments.map(p => `R${p.amount} on ${p.date} (${p.status})`).join(', ')}
- ${groupContext}

Guidelines:
- BE EXTREMELY CONCISE. Give short, direct answers.
- Use a professional but helpful tone.
- Answer the specific question asked immediately.
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
        console.error("Chat Error:", error);
        res.status(500).json({ 
            error: "DEBUG: This is the updated error message.",
            details: error.message,
            stack: error.stack
        });
    }
});
