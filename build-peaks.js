import { parseFile } from 'music-metadata';
import { inspect } from 'util';
import fs from 'fs';
import path from 'path';
import { execSync } from 'node:child_process';
import { Hash } from 'crypto';
import { exit } from 'process';

const BASE_DIR = "./dist"
const TARGET_DIR=`${BASE_DIR}/albums`;
const AUDIOWAVEFORM='audiowaveform'+(process.platform=="win32"?".exe":"");

if (!fs.existsSync(TARGET_DIR)) {
  console.error(`First, put your albums in ${TARGET_DIR}`);
  exit(-1);
}
if (!fs.existsSync(AUDIOWAVEFORM)) {
  console.error(`First, put ${AUDIOWAVEFORM} here. (Download it from https://github.com/bbc/audiowaveform/releases)`);
  exit(-1);
}


walk(TARGET_DIR, function (err, results) {
  if (err) throw err;

  // store all album data
  const albums = new Map();

  const promises = results.filter(f => f.endsWith(".mp3") || f.endsWith(".flac")).map(async f => {
    // Generate data about the current track
    const jsonFile = generateMetadata(f);
    // extract the thumbnail and update the data for each track
    let metadata = await extractThumbnails(jsonFile, f);
    // add video url if exist
    const videoFile = getFile(f,".mp4");
    if (fs.existsSync(videoFile)) {
      metadata.videoUrl = path.relative(BASE_DIR, videoFile).replaceAll('\\', '/');;
    }

    // update the album map
    const albumFolder = path.dirname(f);
    if (!albums.has(albumFolder)) {
      albums.set(albumFolder,
        {
          tracks: [],
        });
    }
    albums.get(albumFolder).tracks.push(metadata);
  });
  Promise.all(promises).then(() =>
    generateAlbums(albums, `${TARGET_DIR}/index.json`)
  );
});


function generateAlbums(albumsMap, output) {
  console.log(`Generating ${output} ...`)
  const albumsData = [];
  albumsMap.forEach((albumEntry, albumKey) => {
    const album = {
      tracks: []
    };
    var maxDurationSec = 0;
    albumEntry.tracks
      .forEach((track, trackIdx) => {
        if (!album.title) {
          album.title = track.id3.album;
        }
        if (!album.year) {
          album.year = track.id3.year;
        }
        if (!album.artist) {
          album.artist = track.id3.artist;
        }
        const durationSec = track.length * track.samples_per_pixel / track.sample_rate;
        const durationStr = new Date(durationSec * 1000).toISOString().substring(11, 19);
        const trackIndex = Number.parseInt(track.id3.track.no ? track.id3.track.no : trackIdx + 1);
        const padTrackNo = `${trackIndex}`.padStart(2, 0);

        album.tracks.push({
          title: track.id3.title,
          index: padTrackNo,
          durationSec: durationSec,
          duration: durationStr,
          metadataUrl: track.metadataUrl,
          url: track.url,
          videoUrl: track.videoUrl ? track.videoUrl : null
        })
        maxDurationSec = Math.max(durationSec, maxDurationSec);
      })
    album.tracks.forEach(track => {
      if (maxDurationSec <= 3600) {
        track.duration = track.duration.substring(3);
      }
      delete track.durationSec;
    })

    album.tracks = album.tracks.sort((a, b) => a.index.localeCompare(b.index));

    const artworkFile = albumKey + "/folder.jpg";
    album.artworkUrl = path.relative(BASE_DIR, artworkFile).replaceAll('\\', '/');

    // Year and title should be set via ID3
    // This is a fallback using the folder name of type "2003 Album title"
    if (!album.year || !album.title) {
      const regexpAlbum = /([0-9]+)\s+(.+)/;
      const albumFolder = path.basename(albumKey);
      const match = albumFolder.match(regexpAlbum);
      var year = "2023"
      var title = albumFolder;
      if (match) {
        if (!album.year) {
          album.year = match[1];
        }
        if (!album.title) {
          album.title = match[2];
        }
      }
    }
    albumsData.push(album);
  });

  fs.writeFileSync(output, JSON.stringify(albumsData));
  console.log("Done");
}

/**
 * Extract the thumbnails and add some calculations
 * This update the metadata file
 * 
 * @param {*} jsonFile Metadata file to update
 * @param {*} f audio file
 * @returns 
 */
async function extractThumbnails(jsonFile, f) {
  let metadata = JSON.parse(fs.readFileSync(jsonFile));
  try {
    await parseFile(f).then(tags => {
      metadata.id3 = tags.common;
      delete metadata.id3.encodersettings;
      if (metadata.id3 && metadata.id3.picture && metadata.id3.picture.length > 0) {
        const artwork = metadata.id3.picture[0];
        var artworkFile = null;
        if (artwork.format === "image/png")
          artworkFile = getFile(f,".png");
        else if (artwork.format === "image/jpeg")
          artworkFile = getFile(f,".jpg");
        fs.writeFileSync(artworkFile, artwork.data);
        metadata.id3.picture = [];
        metadata.artworkUrl = path.relative(BASE_DIR, artworkFile).replaceAll('\\', '/');
      }
      else {
        const albumArtwork = path.dirname(f) + "/folder.jpg";
        metadata.artworkUrl = path.relative(BASE_DIR, albumArtwork).replaceAll('\\', '/');
      }
      fs.writeFileSync(jsonFile, JSON.stringify(metadata));
    }).catch(e => console.error("Parse error for " + jsonFile, e));
  }
  catch (e) {
    console.error("Parse error for " + jsonFile, e);
  }
  // metadataUrl and url will be saved later in generateAlbums()      
  metadata.metadataUrl = path.relative(BASE_DIR, jsonFile).replaceAll('\\', '/');
  metadata.url = path.relative(BASE_DIR, f).replaceAll('\\', '/');
  return metadata;
}
/**
 * Run audiowaveform.exe to generate the metadata of the audio file
 * 
 * @param {*} f The audio file
 * @returns 
 */
function generateMetadata(f) {
  const jsonFile = getFile(f,".json");
  if (!fs.existsSync(jsonFile)) {
    console.log(`Generate ${jsonFile}...`);
    execSync(`${AUDIOWAVEFORM} -q -i \"${f}\" -b 8 -o \"${jsonFile}\" --pixels-per-second 20`);
  }
  return jsonFile;
}

/**
 * Collect recursively all files from a directory and give the result to the callback "done"
 * @param {*} dir 
 * @param {*} done 
 */
function walk(dir, done) {
  var results = [];
  fs.readdir(dir, function (err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function (file) {
      file = path.resolve(dir, file);
      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function (err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

/**
 * Replace the extension of a path by another one
 * @param {*} path 
 * @param {*} ext 
 * @returns 
 */
function getFile(path, ext){
  const idx = path.lastIndexOf('.');    
  const file = path.substring(0,idx)+ext;
  return file;
}
