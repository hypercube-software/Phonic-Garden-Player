const playButton = domGet('#playButton');
const nextButton = domGet('#nextButton');
const prevButton = domGet('#prevButton');
const videoButton = domGet('#videoButton');
const playButtonIcon = domGet('#playButtonIcon');
const waveform = domGet('#waveform');
const muteButton = domGet('#muteButton');
const volumeSlider = domGet('#volumeSlider');
const currentTime = domGet('#currentTime');

window.addEventListener('load', () => {
  playButton.on('click', togglePlay);
  muteButton.on('click', toggleMute);
  nextButton.on('click', playNext);
  prevButton.on('click', playPrev);
  videoButton.on('click', playVideo);
  volumeSlider.on('input', handleVolumeChange);
  setVolumeFromLocalStorage();
});

const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  height: 80,
  responsive: true,
  waveColor: '#666666',
  cursorColor: '#FFFFFF',
  progressColor: '#FF3300',
  mediaControls: false,
  backend: 'MediaElement',
  normalize: true,
  barWidth: 1,
  barRadius: 0,
  barGap: 4,
});

const setIconPlay = (playing) => {
  domGet("#playButton").removeClass("fa-pause");
  domGet("#playButton").removeClass("fa-play");
  if (playing)
    domGet("#playButton").addClass("fa-pause");
  else
    domGet("#playButton").addClass("fa-play");
}

const setIconMute = (mute) => {
  domGet("#muteButton").removeClass("fa-volume-up");
  domGet("#muteButton").removeClass("fa-volume-mute");
  if (mute)
    domGet("#muteButton").addClass("fa-volume-mute");
  else
    domGet("#muteButton").addClass("fa-volume-up");
}


/**
 * Toggle play button
 */
const togglePlay = () => {
  wavesurfer.playPause();
};
const updateIconState = () => {
  const isPlaying = wavesurfer.isPlaying();
  setIconPlay(isPlaying);
  if (isPlaying)
  {
    closeVideoPlayer();
  }
}

/**
 * Handles changing the volume slider input
 * @param {event} e
 */
const handleVolumeChange = (event, element) => {
  // Set volume as input value divided by 100
  // NB: Wavesurfer only excepts volume value between 0 - 1
  const volume = element.value() / 100;

  wavesurfer.setVolume(volume);

  // Save the value to local storage so it persists between page reloads
  localStorage.setItem('audio-player-volume', volume.toString());
};

/**
 * Retrieves the volume value from localstorage and sets the volume slider
 */
const setVolumeFromLocalStorage = () => {
  // Retrieves the volume from localstorage, or falls back to default value of 50
  const volume = Number.parseFloat(localStorage.getItem('audio-player-volume')) * 100 || 50;

  volumeSlider.value(volume);
};

/**
 * Formats time as HH:MM:SS
 * @param {number} seconds
 * @returns time as HH:MM:SS
 */
const formatTimecode = seconds => {
  if (Number.isNaN(seconds))
    return "";
  var pos = new Date(seconds * 1000).toISOString().substring(11, 11 + 8);
  pos = pos.substring(pos.length - wavesurfer.currentTrack.duration.length, pos.length);
  return pos;
};

/**
 * Toggles mute/unmute of the wavesurfer volume
 * Also changes the volume icon and disables the volume slider
 */
const toggleMute = () => {
  wavesurfer.toggleMute();

  const isMuted = wavesurfer.getMute();

  setIconMute(isMuted);
  if (isMuted) {
    volumeSlider.disabled = true;
  } else {
    volumeSlider.disabled = false;
  }
};


function onReady() {
  console.info("Wavesurfer Ready");
  // Set wavesurfer volume
  wavesurfer.setVolume(volumeSlider.value() / 100);

  updateIconState();
  if (!wavesurfer.isPlaying()) {
    wavesurfer.play();
  }

}


// Wavesurfer event listeners
var prevEvent = "";

wavesurfer.on('loading', (p) => {
  console.info("loading " + p + "%");
  prevEvent = "loading";
})
wavesurfer.on('success', () => {
  console.info("success");
})
wavesurfer.on('finish', () => {
  console.info("finish");
})
wavesurfer.on('destroy', () => {
  console.info("destroy");
})

wavesurfer.on('waveform-ready', onReady);
wavesurfer.on('ready', onReady);
wavesurfer.on('error', (err) => {
  console.error(err);
});

// Sets the timecode current timestamp as audio plays
wavesurfer.on('audioprocess', () => {
  const time = wavesurfer.getCurrentTime();
  currentTime.html(formatTimecode(time));

});
wavesurfer.on('audioprocess', updateIconState);
wavesurfer.on('pause', updateIconState);
wavesurfer.on('play', updateIconState);

// Resets the play button icon after audio ends
wavesurfer.on('finish', () => {
  playNext();
});


var entries = [];

function limitTrackTitle(txt) {
	if (txt.length<20)
		return txt;
	else
		return txt.substring(0,20)+"..."
}
function formatTitle(txt){
	return txt.replaceAll("(","\n").replaceAll(")","");	
}
function loadPlaylist(album) {

  const domPlaylist = domGet('.playlist')
  domPlaylist.empty();
  entries = album.tracks;
  album.tracks.forEach((track, idx) => {
    track.parent = album;
    track.album = album.title;
    track.artist = album.artist;
    track.year = album.year;
    currentTime.html("00:00:00".substring(0, track.duration.length));
    const duration = "<div class=\"track-duration\">" + track.duration + "</div>";
    const video = track.videoUrl ? '&nbsp;&nbsp;<i class="fa-solid fa-video"></i>' : '';

    domPlaylist.appendHTML('<li class="playTrack" data-id="' + idx + '"><div>' + track.index + " " + limitTrackTitle(track.title) + video + "</div>" + duration + '</li>');
  });
  domPlaylist.scrollTop(0);
  autoPlayTrack(album);
}

function displayTrack(track) {
  if (track.json.artworkUrl) {
    domGet("#picture").attr("src", track.json.artworkUrl);
  }
  domGet("#trackTitle").text(formatTitle(track.title))  
  domGet("#totalDuration").text(track.duration);
  const domFields = domGet(".track-info-fields");
  domFields.empty();
  domFields.appendHTML(`<div class="track-info-field"><label>Album:</label><div>${track.album}</div></div>`)
  domFields.appendHTML(`<div class="track-info-field"><label>Year :</label><div>${track.year}</div></div>`)
  domFields.appendHTML(`<div class="track-info-field"><label>Band :</label><div>${track.artist}</div></div>`)

}
function loadTrack(track) {
  if (!track)
    return;

  if (track.videoUrl) {
    domGet("#videoButton").addClass("visible");
  }
  else {
    domGet("#videoButton").removeClass("visible");
  }

  currentTrack = track;
  currentAlbum = track.parent;

  const baseUrl = getBaseUrl();
  history.replaceState(null, null, baseUrl + track.album + "/" + track.title)

  fetch(baseUrl + track.metadataUrl, { cache: "no-store" })
    .then((response) => response.json())
    .then((json) => {
      // https://github.com/bbc/audiowaveform/blob/master/doc/DataFormat.md#json-data-format-json
      track.json = json;

      if (track.json.artworkUrl) {
        track.json.artworkUrl = baseUrl + track.json.artworkUrl;
      }
      else {
        track.json.artworkUrl = track.parent.artworkUrl;
      }

      displayTrack(track);
      const peaks = json.data;
      console.info("wavesurfer.load " + track.url);
      wavesurfer.currentTrack = track;
      wavesurfer.load(baseUrl + track.url, peaks, 'none');
      wavesurfer.play();
    })
    .catch(e => {
      console.error("Error parsing " + track.meta, e)
    });

}
