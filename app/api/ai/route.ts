import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const MODELS = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768'
    ];

    let responseText = null;
    let lastError: any = null;

    for (const model of MODELS) {
      try {
        const completion = await groq.chat.completions.create({
          messages,
          model,
          temperature: 0.7,
          max_tokens: 1024,
        });

        if (completion.choices[0]?.message?.content) {
          responseText = completion.choices[0].message.content;
          break; // Successfully generated, exit loop
        }
      } catch (error: any) {
        console.warn(`Groq model ${model} failed:`, error.message);
        lastError = error;

        // If the API key is invalid, there is no point trying other models
        if (error.status === 401) {
          throw new Error('Invalid Groq API Key. Please check your configuration.');
        }
        // For 429 (Rate Limit / Quota Exceeded) or 500/503, we continue to the next model
      }
    }

    if (!responseText) {
      const status = lastError?.status || 500;
      let errorMessage = 'All AI models are currently unavailable. Please try again later.';
      
      if (status === 429) {
        errorMessage = "AI quota exceeded or high traffic. Please try again in a little while!";
      } else if (lastError?.message) {
        errorMessage = `AI Error: ${lastError.message}`;
      }

      return NextResponse.json({ error: errorMessage }, { status: status >= 400 && status < 600 ? status : 500 });
    }

    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error('Groq API Error Wrapper:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during AI generation' },
      { status: error.status || 500 }
    );
  }
}
