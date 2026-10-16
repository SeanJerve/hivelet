"""The pitch's voiceover, one WAV per phrase, from src/pitch/script.json.

Kokoro-82M (Apache-2.0) through kokoro-onnx, offline. Each phrase is phonemized,
the fixes in script.json are applied (names espeak gets wrong), and the phonemes
are voiced. Writes public/pitch/vo/<id>.wav and src/pitch/vo.json (each clip's
length in seconds), which the timeline reads.

  python capture/pitch_voice.py MODEL.onnx VOICES.npz

The model is model_quantized.onnx of onnx-community/Kokoro-82M-v1.0-ONNX
(sha256 fbae9257...a1478; also on npm as kokoro-q8-shards). VOICES.npz holds each
voice as a (510, 1, 256) float32 array (the .bin files in the kokoro-js package).
"""
import json, sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

root = Path(__file__).resolve().parent.parent
script = json.loads((root / 'src' / 'pitch' / 'script.json').read_text())
k = Kokoro(sys.argv[1], sys.argv[2])
out = root / 'public' / 'pitch' / 'vo'
out.mkdir(parents=True, exist_ok=True)
lengths = {}
for line in script['lines']:
    ph = k.tokenizer.phonemize(line['text'], 'en-us')
    for wrong, right in script['fixes'].items():
        ph = ph.replace(wrong, right)
    audio, sr = k.create(ph, voice=script['voice'], speed=script['speed'], is_phonemes=True)
    audio = np.asarray(audio, dtype=np.float32)
    # Every phrase at the same loudness: the speech itself (30 ms frames that are not
    # silence) at RMS -16 dBFS, so pauses inside a long line do not make it louder.
    # A soft knee above 0.6 then rounds the odd plosive off under 0.95 instead of
    # turning the whole line down for it.
    w = sr * 30 // 1000
    frames = audio[: len(audio) // w * w].reshape(-1, w)
    level = np.sqrt((frames ** 2).mean(1))
    speech = level[level > 0.1 * level.max()]
    audio = audio * (10 ** (-16 / 20) / max(float(np.sqrt((speech ** 2).mean())), 1e-6))
    knee, room = 0.6, 0.35
    over = np.abs(audio) > knee
    audio[over] = np.sign(audio[over]) * (knee + room * np.tanh((np.abs(audio[over]) - knee) / room))
    # A 15 ms fade at each end, so no clip starts or stops on a click.
    n = int(sr * 0.015)
    audio[:n] *= np.linspace(0, 1, n)
    audio[-n:] *= np.linspace(1, 0, n)
    sf.write(out / f"{line['id']}.wav", audio, sr, subtype='PCM_16')
    lengths[line['id']] = round(len(audio) / sr, 3)
    print(f"{line['id']:10s} {lengths[line['id']]:5.2f}s  {ph}")
(root / 'src' / 'pitch' / 'vo.json').write_text(json.dumps(lengths, indent=1) + '\n')
print('total speech', round(sum(lengths.values()), 2), 's')
