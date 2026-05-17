"""
Real audio playback engine using sounddevice callback-based streaming.
Replaces the virtual time.time()-based engine for actual speaker output.
"""
import threading
import time
from pathlib import Path

import numpy as np
import sounddevice as sd
import soundfile as sf
from pydub import AudioSegment


class AudioEngine:
    def __init__(self):
        self._audio_data: np.ndarray | None = None
        self._sample_rate: int = 44100
        self._channels: int = 2
        self._frame_position: int = 0
        self._total_frames: int = 0
        self._is_playing: bool = False
        self._is_paused: bool = False
        self._stream: sd.OutputStream | None = None
        self._lock = threading.Lock()
        self._file_path: str | None = None

    @property
    def is_playing(self) -> bool:
        return self._is_playing

    @property
    def duration_ms(self) -> int:
        if self._total_frames > 0 and self._sample_rate > 0:
            return int(self._total_frames / self._sample_rate * 1000)
        return 0

    @property
    def duration(self) -> float:
        return self.duration_ms / 1000.0

    @property
    def playhead_ms(self) -> int:
        return int(self._frame_position / self._sample_rate * 1000)

    @property
    def current_time(self) -> float:
        return self.playhead_ms / 1000.0

    @property
    def audio_path(self) -> str | None:
        return self._file_path

    def load(self, file_path: str) -> bool:
        """Load audio file into memory. Returns True on success."""
        self.stop()
        self._file_path = file_path
        try:
            ext = Path(file_path).suffix.lower()
            if ext in ('.mp3', '.m4a', '.aac', '.wma', '.ogg', '.flac'):
                cached_wav = Path(f"{file_path}.converted.wav")
                if not cached_wav.exists():
                    audio = AudioSegment.from_file(file_path)
                    audio.export(str(cached_wav), format="wav")
                data, sr = sf.read(str(cached_wav), dtype='float32')
            else:
                data, sr = sf.read(file_path, dtype='float32')

            if data.ndim == 1:
                data = np.column_stack([data, data])

            self._audio_data = data
            self._sample_rate = sr
            self._channels = data.shape[1]
            self._total_frames = data.shape[0]
            self._frame_position = 0
            return True
        except Exception as e:
            print(f"[AudioEngine] Load failed: {e}")
            return False

    def play(self) -> None:
        if self._is_playing:
            return
        if self._audio_data is None or self._total_frames == 0:
            return
        if self._frame_position >= self._total_frames:
            self._frame_position = 0

        try:
            self._stream = sd.OutputStream(
                samplerate=self._sample_rate,
                channels=self._channels,
                dtype='float32',
                callback=self._audio_callback,
                blocksize=2048,
                finished_callback=self._stream_finished,
            )
            self._stream.start()
            self._is_playing = True
            self._is_paused = False
        except sd.PortAudioError:
            try:
                sd._terminate()
                time.sleep(0.2)
                sd._initialize()
                self._stream = sd.OutputStream(
                    samplerate=self._sample_rate,
                    channels=self._channels,
                    dtype='float32',
                    callback=self._audio_callback,
                    blocksize=2048,
                )
                self._stream.start()
                self._is_playing = True
                self._is_paused = False
            except Exception as e:
                print(f"[AudioEngine] PortAudio retry failed: {e}")

    def _audio_callback(self, outdata, frames, _time_info, status):
        if status:
            print(f"[AudioEngine] Callback status: {status}")
        if not self._is_playing or self._audio_data is None:
            outdata.fill(0)
            return

        with self._lock:
            start = self._frame_position
            end = start + frames

            if start >= self._total_frames:
                outdata.fill(0)
                self._is_playing = False
            elif end > self._total_frames:
                available = self._total_frames - start
                outdata[:available] = self._audio_data[start:self._total_frames]
                outdata[available:] = 0
                self._frame_position = self._total_frames
                self._is_playing = False
            else:
                outdata[:] = self._audio_data[start:end]
                self._frame_position = end

    def _stream_finished(self):
        self._is_playing = False

    def pause(self) -> None:
        self._is_playing = False
        self._is_paused = True

    def stop(self) -> None:
        self._is_playing = False
        self._is_paused = False
        self._frame_position = 0
        if self._stream is not None:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception:
                pass
            self._stream = None

    def seek(self, position_ms: int) -> None:
        with self._lock:
            target_frame = int(position_ms / 1000.0 * self._sample_rate)
            target_frame = max(0, min(target_frame, self._total_frames))
            self._frame_position = target_frame

    def get_state(self) -> dict:
        ct = self.playhead_ms
        return {
            "type": "playback_state",
            "is_playing": self._is_playing,
            "current_time": round(ct / 1000.0, 3),
            "position_ms": ct,
            "duration": round(self.duration, 3),
            "duration_ms": self.duration_ms,
            "audio_path": self._file_path,
        }

    def get_waveform_peaks(self, path: str, num_peaks: int = 800) -> list:
        try:
            ext = Path(path).suffix.lower()
            if ext in ('.mp3', '.m4a', '.aac', '.wma'):
                cached = Path(f"{path}.converted.wav")
                if cached.exists():
                    data, _ = sf.read(str(cached), dtype='float32')
                else:
                    return [0.0] * num_peaks
            else:
                data, _ = sf.read(path, dtype='float32')

            if data.ndim > 1:
                data = data.mean(axis=1)
            data = np.abs(data)
            max_val = float(np.max(data)) or 1.0
            data = data / max_val

            chunk_size = max(1, len(data) // num_peaks)
            peaks = []
            for i in range(0, len(data), chunk_size):
                chunk = data[i:i + chunk_size]
                peaks.append(float(np.max(chunk)))
                if len(peaks) >= num_peaks:
                    break
            while len(peaks) < num_peaks:
                peaks.append(0.0)
            return peaks[:num_peaks]
        except Exception:
            return [0.0] * num_peaks
