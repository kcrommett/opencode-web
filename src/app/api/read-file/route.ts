import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }
    // Read the file from the current working directory
    const content = await fs.readFile(path, 'utf-8');
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Failed to read file locally:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}