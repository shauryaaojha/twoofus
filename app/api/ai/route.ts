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

    const messages: any[] = [];
    
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

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const responseText = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error('Groq API Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during AI generation' },
      { status: 500 }
    );
  }
}
