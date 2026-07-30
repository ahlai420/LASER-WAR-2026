Custom sound effects. Drop your own files here to replace the built-in ones.

  laser.mp3      played when the laser fires
  hit.mp3        played when the beam strikes a block
  explosion.mp3  played when a generator is destroyed

.wav and .ogg also work -- name them laser.wav, hit.ogg, and so on.

Nothing in the code needs changing. Any file you do NOT provide falls back to
the built-in synthesised sound, so the game always has audio. The dice roll is
synthesised only and does not read a file.

Keep them short: under about 1 second for laser and hit, under 2 for explosion.
