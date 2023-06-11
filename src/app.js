// global state
var albums = [];
var currentTrackDiv = null;
var currentAlbumDiv = null;
var currentTrack = null;
var currentAlbum = null;
var videoPlayer = null; //Plyr instance

function viewAlbums() {
    const content = domGet(".content");
    content.removeClass("v1");
    content.removeClass("v2");
    content.removeClass("v3");
    content.addClass("v1");
}
function viewPlayer() {
    const content = domGet(".content");
    content.removeClass("v1");
    content.removeClass("v2");
    content.removeClass("v3");
    content.addClass("v2");
}
function viewTracks() {
    const content = domGet(".content");
    content.removeClass("v1");
    content.removeClass("v2");
    content.removeClass("v3");
    content.addClass("v3");
}

// on playlist track click
domGet(".playlist").on("click", ".playTrack", (evt, element) => playTrack(element));
domGet(".albums").on("click", ".album", (evt, element) => playAlbum(element));
domGet("#album-view").on("click", viewAlbums);
domGet("#player-view").on("click", viewPlayer);
domGet("#tracks-view").on("click", viewTracks);
domGet("#picture").on("click", toggleArtwork);

function getContentView() {
    const content = domGet(".content");
    if (content.hasClass("v1"))
        return "v1";
    if (content.hasClass("v2"))
        return "v2";
    if (content.hasClass("v3"))
        return "v3";
    return null;
}
onPanLeft(() => {
    const view = getContentView();
    switch (view) {
        case "v1": viewPlayer(); break;
        case "v2": viewTracks(); break;
        case "v3": viewAlbums(); break;
    }
});
onPanRight(() => {
    const view = getContentView();
    switch (view) {
        case "v1": viewTracks(); break;
        case "v2": viewAlbums(); break;
        case "v3": viewPlayer(); break;
    }
});

function isMobileMode() {
    return domGet(".content").style("position") === "relative";
}
function toggleArtwork(event, picture) {
    if (currentTrack && currentAlbum) {
        const currentImageUrl = picture.attr("src");
        if (currentImageUrl == currentAlbum.artworkUrl) {
            picture.attr("src", currentTrack.json.artworkUrl);
        }
        else {
            picture.attr("src", currentAlbum.artworkUrl);
        }
    }
}
function getBaseUrl() {
    const url = new URL(window.location.href);
    if (url.host.startsWith("localhost"))
        return url.origin + "/";
    else
        return url.origin + "@@BASEURL@@/";
}
function getCurrentTrackIndex() {
    const track = domGet(".playTrack.selected")
    const entryIndex = track.idata('id');
    return entryIndex;
}
function getCurrentAlbumIndex() {
    const album = domGet(".album.selected")
    const albumIndex = album.idata('id');
    return albumIndex;
}
function closeVideoPlayer() {
    if (videoPlayer) {
        const videoPlayerContainer = domGet("#video-container");
        const artwork = domGet("#picture");
        videoPlayerContainer.removeClass("visible");
        artwork.addClass("visible")
        videoPlayer.destroy();
        videoPlayerContainer.html("");
        videoPlayer = null;
    }
};
function playVideo() {
    wavesurfer.pause();
    const trackDiv = domGet(".playTrack.selected")
    const entryIndex = trackDiv.idata('id');
    const entry = entries[entryIndex];
    const videoUrl = entry.videoUrl.startsWith("http") ? entry.videoUrl : getBaseUrl() + entry.videoUrl;
    const videoPlayerContainer = domGet("#video-container");
    const artwork = domGet("#picture");
    let html = '<video id="video-player" playsinline controls autoplay>\n';
    html += `<source src="${videoUrl}" type="video/mp4" />\n`;
    html += '</video>\n';
    videoPlayerContainer.html(html);
    videoPlayerContainer.addClass("visible");
    artwork.removeClass("visible");
    videoPlayer = new Plyr('#video-player', {
        title: entry.title,
        controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
    });

    videoPlayer.on("ended", closeVideoPlayer);
}
function playNext() {
    const entryIndex = getCurrentTrackIndex();
    const albumIndex = getCurrentAlbumIndex();
    const nextTrack = domGet(`.playTrack[data-id="${entryIndex + 1}"]`)
    if (nextTrack) {
        playTrack(nextTrack);
    }
    else {
        let nextAlbum = domGet(`.album[data-id="${albumIndex + 1}"]`);
        if (!nextAlbum) {
            nextAlbum = domGet(`.album[data-id="0"]`);
        }
        playAlbum(nextAlbum);
    }
}
function playPrev() {
    const entryIndex = getCurrentTrackIndex();
    const nextTrack = domGet(`.playTrack[data-id="${entryIndex - 1}"]`)
    if (nextTrack) {
        playTrack(nextTrack);
    }
}

function playAlbum(albumDiv) {
    if (currentAlbumDiv) {
        currentAlbumDiv.removeClass("selected");
    }
    if (!albumDiv)
        return;
    albumDiv.addClass("selected");
    currentAlbumDiv = albumDiv;

    const albumIndex = albumDiv.idata('id');
    loadPlaylist(albums[albumIndex])
    if (isMobileMode()) {
        viewPlayer();
    }
}
function playTrack(trackDiv) {
    closeVideoPlayer();
    
    if (currentTrackDiv) {
        currentTrackDiv.removeClass("selected");
    }
    if (!trackDiv)
        return;
    trackDiv.addClass("selected");
    currentTrackDiv = trackDiv;

    const entryIndex = trackDiv.idata('id');
    const entry = entries[entryIndex];
    loadTrack(entry);
    if (isMobileMode()) {
        viewPlayer();
    }
}
function autoPlayAlbum() {
    const url = new URL(window.location.href);
    const playUrl = url.searchParams.get("play");
    if (playUrl) {
        albums.filter(album => playUrl.startsWith(album.title + "/"))
            .forEach(album => {
                playAlbum(domGet(`.album[data-id='${album.index}']`));
            });
    }
    else {
        playAlbum(domGet(".album[data-id='0']"));
    }
}
function autoPlayTrack(album) {
    const url = new URL(window.location.href);
    const playUrl = url.searchParams.get("play");
    if (playUrl) {
        album.tracks
            .forEach((track, trackIndex) => {
                if (album.title + "/" + track.title === playUrl) {
                    playTrack(domGet(`.playTrack[data-id='${trackIndex}']`));
                }
            });
    }
    else {
        playTrack(domGet(`.playTrack[data-id='0']`));
    }
}

fetch("./albums/index.json", { cache: "no-store" })
    .then((response) => response.json())
    .then((json) => {
        albums = json;
        const baseUrl = getBaseUrl();
        const domAlbums = domGet(".albums");
        domAlbums.empty();
        albums.sort((a, b) => b.year - a.year)
            .forEach((album, idx) => {
                album.index = idx;
                album.artworkUrl = baseUrl + album.artworkUrl;
                domAlbums.appendHTML(`<li class="album neomorphism" data-id="${idx}"><img src="${album.artworkUrl}"></img><div class="title">${album.title}</div><div class="year">${album.year}</div></li>`)
            });
        autoPlayAlbum()
    });

// https://github.com/VincentGarreau/particles.js/
if (!isMobileMode()) {
    particlesJS.load('particles-js', 'assets/particles.json', function () {
        console.log('callback - particles.js config loaded');
    });
}  
