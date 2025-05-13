"""
Voice Utilities Module

This module provides utility functions for handling voice input processing,
particularly focusing on speech-to-text transcription using OpenAI's API.

Functions:
- transcribe_audio(audio_file): Transcribe audio to text using OpenAI's API
- process_audio_file(audio_data): Process raw audio data into appropriate format

Dependencies:
- OpenAI API for transcription
- pydub for audio processing
"""

import os
import io
import tempfile
from typing import BinaryIO
from openai import OpenAI
from pydub import AudioSegment

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def transcribe_audio(audio_file: BinaryIO) -> str:
    """
    Transcribe audio to text using OpenAI's transcription API.
    
    Args:
        audio_file (BinaryIO): Audio file object
        
    Returns:
        str: Transcribed text
        
    Raises:
        Exception: If transcription fails
    """
    try:
        transcription_response = openai_client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=audio_file,
            response_format="text"
        )
        
        transcription = transcription_response.text if hasattr(transcription_response, "text") else transcription_response
        return transcription.strip()
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise

async def process_audio_file(audio_data: bytes) -> str:
    """
    Convert raw audio data into a temporary WAV file.
    
    Args:
        audio_data (bytes): Raw audio data from request
        
    Returns:
        str: Path to the temporary WAV file
        
    Raises:
        ValueError: If audio processing fails
    """
    try:
        audio_io = io.BytesIO(audio_data)
        try:
            audio = AudioSegment.from_wav(audio_io)
        except Exception:
            audio_io.seek(0)
            try:
                audio = AudioSegment.from_file(audio_io, format="webm")
            except Exception:
                audio_io.seek(0)
                audio = AudioSegment.from_file(audio_io)
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        temp_file_path = temp_file.name
        temp_file.close()
        audio.export(temp_file_path, format="wav")
        return temp_file_path
    except Exception as e:
        raise ValueError(f"Error processing audio file: {str(e)}") 