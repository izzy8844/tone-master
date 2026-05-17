"""Patch for Python 3.13+: register pyaudioop alias for pydub compatibility."""
import sys
import audioop

sys.modules["pyaudioop"] = audioop
