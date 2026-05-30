import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Groq API key not configured' },
        { status: 500 }
      );
    }

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
    
    // System prompt for persona
    messages.push({
      role: 'system',
      content: 'You are a helpful, friendly AI assistant participating in a chat application for couples. Keep your answers concise, engaging, and friendly.'
    });

    if (context) {
      messages.push({
        role: 'user',
        content: `Context (the message I am replying to): "${context}"`
      });
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    const MODEL = 'llama-3.3-70b-versatile';

    let responseText = null;
    let lastError: unknown = null;

    try {
      const completion = await groq.chat.completions.create({
        messages,
        model: MODEL,
        temperature: 0.7,
        max_tokens: 1024,
      });

      if (completion.choices[0]?.message?.content) {
        responseText = completion.choices[0].message.content;
      }
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number };
      console.warn(`Groq model ${MODEL} failed:`, err.message);
      lastError = err;

      if (err.status === 401) {
        throw new Error('Invalid Groq API Key. Please check your configuration.');
      }
    }

    if (!responseText) {
      const err = lastError as { message?: string; status?: number } | null;
      const status = err?.status || 500;
      let errorMessage = 'All AI models are currently unavailable. Please try again later.';
      
      if (status === 429) {
        errorMessage = "AI quota exceeded or high traffic. Please try again in a little while!";
      } else if (err?.message) {
        errorMessage = `AI Error: ${err.message}`;
      }

      return NextResponse.json({ error: errorMessage }, { status: status >= 400 && status < 600 ? status : 500 });
    }

    return NextResponse.json({ text: responseText });
  } catch (error: unknown) {
    console.error('Groq API Error Wrapper:', error);
    const err = error as { message?: string; status?: number };
    return NextResponse.json(
      { error: err.message || 'An error occurred during AI generation' },
      { status: err.status || 500 }
    );
  }
}
