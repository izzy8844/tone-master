import time
from pathlib import Path
from typing import Optional

import numpy as np
from pydub import AudioSegment


class AudioEngine:
    """Virtual playback engine — tracks time, serves waveform data."""

    def __init__(self) -> None:
        self._is_playing: bool = False
        self._current_time: float = 0.0
        self._duration: float = 0.0
        self._play_start_wall: float = 0.0
        self._play_start_time: float = 0.0
        self._audio_path: Optional[str] = None
        self._samples: Optional[np.ndarray] = None

    @property
    def is_playing(self) -> bool:
        return self._is_playing

    @property
    def current_time(self) -> float:
        if self._is_playing:
            elapsed = time.time() - self._play_start_wall
            t = self._play_start_time + elapsed
            if t >= self._duration:
                self._is_playing = False
                return 0.0
            return t
        return self._current_time

    @property
    def duration(self) -> float:
        return self._duration

    def load(self, path: str) -> float:
        """Load an audio file and return its duration in seconds."""
        self.stop()
        self._audio_path = path
        try:
            audio = AudioSegment.from_file(path)
            self._duration = len(audio) / 1000.0
            samples = audio.set_channels(1).get_array_of_samples()
            self._samples = np.array(samples, dtype=np.float32) / (2 ** 15)
            return self._duration
        except Exception as e:
            print(f"[AudioEngine] Load failed: {e}")
            self._duration = 0.0
            self._samples = None
            return 0.0

    def play(self) -> None:
        if self._duration <= 0:
            return
        self._is_playing = True
        self._play_start_wall = time.time()
        self._play_start_time = self._current_time

    def pause(self) -> None:
        if self._is_playing:
            self._current_time = self.current_time
        self._is_playing = False

    def stop(self) -> None:
        self._is_playing = False
        self._current_time = 0.0

    def seek(self, time_sec: float) -> None:
        self._current_time = max(0.0, min(time_sec, self._duration))
        if self._is_playing:
            self._play_start_wall = time.time()
            self._play_start_time = self._current_time

    def get_state(self) -> dict:
        return {
            "type": "playback_state",
            "is_playing": self._is_playing,
            "current_time": round(self.current_time, 3),
            "duration": round(self._duration, 3),
            "audio_path": self._audio_path,
        }

    def get_waveform_peaks(self, path: str, num_peaks: int = 800) -> list[float]:
        """Return normalized waveform peaks for frontend rendering."""
        if path != self._audio_path or self._samples is None:
            self.load(path)

        if self._samples is None or len(self._samples) == 0:
            return [0.0] * num_peaks

        chunk_size = max(1, len(self._samples) // num_peaks)
        peaks = []
        for i in range(0, len(self._samples), chunk_size):
            chunk = np.abs(self._samples[i : i + chunk_size])
            peaks.append(float(np.max(chunk)) if len(chunk) > 0 else 0.0)
            if len(peaks) >= num_peaks:
                break

        # Pad to exact count
        while len(peaks) < num_peaks:
            peaks.append(0.0)

        # Normalize
        max_val = max(peaks) if peaks else 1.0
        if max_val > 0:
            peaks = [p / max_val for p in peaks]

        return peaks[:num_peaks]
