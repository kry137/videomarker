import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  FileVideo,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";

interface VideoMarker {
  id: string;
  time: number;
  label: string;
}

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00.000";
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function markerStorageKey(file: File | null): string | null {
  if (!file) return null;
  return `video-marker:v1:${file.name}:${file.size}:${file.lastModified}`;
}

function readMarkers(key: string | null): VideoMarker[] {
  if (!key) return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is VideoMarker =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.time === "number" &&
        typeof item.label === "string",
    );
  } catch {
    return [];
  }
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markerImportRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(0.5);
  const [markers, setMarkers] = useState<VideoMarker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [newMarkerLabel, setNewMarkerLabel] = useState("");
  const [notice, setNotice] = useState("");

  const storageKey = useMemo(() => markerStorageKey(file), [file]);

  useEffect(() => {
    if (!file) {
      setVideoUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setMarkers(readMarkers(markerStorageKey(file)));
    setSelectedMarkerId(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(markers));
  }, [markers, storageKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = playbackRate;
  }, [playbackRate, videoUrl]);

  const sortedMarkers = useMemo(
    () => [...markers].sort((a, b) => a.time - b.time),
    [markers],
  );

  // TODO: UNUSED
  // const selectedMarkerIndex = sortedMarkers.findIndex(
  //   (marker) => marker.id === selectedMarkerId,
  // );

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
    event.target.value = "";
  };

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const maximum = Number.isFinite(video.duration) ? video.duration : time;
    video.currentTime = Math.max(0, Math.min(time, maximum));
    setCurrentTime(video.currentTime);
  }, []);

  const addMarker = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.currentTime)) return;

    const time = video.currentTime;
    const duplicate = markers.find((marker) => Math.abs(marker.time - time) < 0.03);
    if (duplicate) {
      setSelectedMarkerId(duplicate.id);
      setNotice("Sudah ada penanda di posisi yang hampir sama.");
      window.setTimeout(() => setNotice(""), 2400);
      return;
    }

    const marker: VideoMarker = {
      id: crypto.randomUUID(),
      time,
      label: newMarkerLabel.trim() || `Penanda ${markers.length + 1}`,
    };
    setMarkers((current) => [...current, marker]);
    setSelectedMarkerId(marker.id);
    setNewMarkerLabel("");
    setNotice(`Penanda ditambahkan pada ${formatTime(time)}.`);
    window.setTimeout(() => setNotice(""), 2400);
  }, [markers, newMarkerLabel]);

  const goToMarker = useCallback(
    (direction: -1 | 1) => {
      if (sortedMarkers.length === 0) return;
      const time = videoRef.current?.currentTime ?? currentTime;

      if (direction === 1) {
        const next = sortedMarkers.find((marker) => marker.time > time + 0.025);
        const target = next ?? sortedMarkers[0];
        seekTo(target.time);
        setSelectedMarkerId(target.id);
        return;
      }

      const previous = [...sortedMarkers]
        .reverse()
        .find((marker) => marker.time < time - 0.025);
      const target = previous ?? sortedMarkers[sortedMarkers.length - 1];
      seekTo(target.time);
      setSelectedMarkerId(target.id);
    },
    [currentTime, seekTo, sortedMarkers],
  );

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => {
        setNotice("Video tidak bisa diputar. Coba pilih file video lain.");
        window.setTimeout(() => setNotice(""), 3000);
      });
    } else {
      video.pause();
    }
  }, []);

  const removeMarker = (id: string) => {
    setMarkers((current) => current.filter((marker) => marker.id !== id));
    if (selectedMarkerId === id) setSelectedMarkerId(null);
  };

  const updateMarkerLabel = (id: string, label: string) => {
    setMarkers((current) =>
      current.map((marker) => (marker.id === id ? { ...marker, label } : marker)),
    );
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement && 
        !target.classList.contains('alwaysListen') &&
        (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable 
        )
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      } else if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        addMarker();
      } else if (event.key === "q") {
        event.preventDefault();
        addMarker();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToMarker(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToMarker(-1);
      } else if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        goToMarker(1);
      } else if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        goToMarker(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addMarker, goToMarker, togglePlayback]);

  const handleVideoKeyDown = (event: ReactKeyboardEvent<HTMLVideoElement>) => {
    if (event.key === " ") event.preventDefault();
  };

  const exportMarkers = () => {
    if (!file) return;
    const content = JSON.stringify(
      {
        video: file.name,
        duration,
        markers: sortedMarkers,
      },
      null,
      2,
    );
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${file.name.replace(/\.[^.]+$/, "")}-markers.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importMarkers = (event: ChangeEvent<HTMLInputElement>) => {
    const importedFile = event.target.files?.[0];
    if (!importedFile) return;
    void importedFile.text().then((text) => {
      try {
        const data: unknown = JSON.parse(text);
        if (
          typeof data !== "object" ||
          data === null ||
          !("markers" in data) ||
          !Array.isArray(data.markers)
        ) {
          throw new Error("Format tidak sesuai");
        }
        const imported = data.markers.filter(
          (item): item is VideoMarker =>
            typeof item === "object" &&
            item !== null &&
            typeof item.id === "string" &&
            typeof item.time === "number" &&
            typeof item.label === "string",
        );
        setMarkers(imported);
        setSelectedMarkerId(null);
        setNotice(`${imported.length} penanda berhasil diimpor.`);
      } catch {
        setNotice("File JSON tidak memiliki format penanda yang valid.");
      }
      window.setTimeout(() => setNotice(""), 3000);
    });
    event.target.value = "";
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><BookmarkPlus size={21} /></div>
          <div>
            <h1>Video Marker</h1>
            <p>Pelajari video selangkah demi selangkah</p>
          </div>
        </div>
        <button className="button button-primary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={17} /> Pilih video
        </button>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="video/*"
          onChange={chooseFile}
        />
      </header>

      <div className="workspace">
        <section className="main-column">
          <div className="video-card">
            <div className="video-stage">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) setDuration(videoRef.current.duration);
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onKeyDown={handleVideoKeyDown}
                  onClick={togglePlayback}
                  playsInline
                />
              ) : (
                <button className="empty-video" onClick={() => fileInputRef.current?.click()}>
                  <span className="empty-video-icon"><FileVideo size={34} /></span>
                  <strong>Buka video tutorial</strong>
                  <span>Pilih file video dari komputermu</span>
                  <span className="supported">Video tetap diproses secara lokal di browser.</span>
                </button>
              )}
            </div>

            <div className="video-controls">
              <button className="icon-button play-button" aria-label={isPlaying ? "Jeda" : "Putar"} onClick={togglePlayback} disabled={!videoUrl}>
                {isPlaying ? <Pause size={19} /> : <Play size={19} />}
              </button>
              <span className="time-display">{formatTime(currentTime)}</span>
              <span className="time-divider">/</span>
              <span className="time-total">{formatTime(duration)}</span>
              <div className="control-spacer" />
              <Volume2 size={17} className="muted-icon" />
              <label className="rate-label" htmlFor="playback-rate">Kecepatan</label>
              <select
                id="playback-rate"
                value={playbackRate}
                onChange={(event) => setPlaybackRate(Number(event.target.value))}
                disabled={!videoUrl}
              >
                {PLAYBACK_RATES.map((rate) => (
                  <option key={rate} value={rate}>{rate}×</option>
                ))}
              </select>
            </div>

            <div className="seek-row">
              <input
                aria-label="Posisi video"
                className="alwaysListen"
                type="range"
                min={0}
                max={duration || 1}
                step={0.01}
                value={Math.min(currentTime, duration || 1)}
                onChange={(event) => seekTo(Number(event.target.value))}
                disabled={!videoUrl}
              />
            </div>
          </div>

          <section className="timeline-card">
            <div className="section-heading">
              <div>
                <h2>Timeline penanda</h2>
                <p>Klik penanda untuk menuju waktu tersebut.</p>
              </div>
              <span className="count-pill">{markers.length} penanda</span>
            </div>
            <div className="timeline" onClick={(event) => {
              if (!duration) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
              seekTo(fraction * duration);
            }}>
              <div className="timeline-progress" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
              {sortedMarkers.map((marker, index) => (
                <button
                  key={marker.id}
                  className={`timeline-marker ${selectedMarkerId === marker.id ? "selected" : ""}`}
                  style={{ left: `${duration ? (marker.time / duration) * 100 : 0}%` }}
                  title={`${marker.label} — ${formatTime(marker.time)}`}
                  aria-label={`Pilih ${marker.label} pada ${formatTime(marker.time)}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    seekTo(marker.time);
                    setSelectedMarkerId(marker.id);
                  }}
                >
                  <span>{index + 1}</span>
                </button>
              ))}
              {!videoUrl && <span className="timeline-empty-label">Pilih video untuk mulai</span>}
            </div>
            <div className="timeline-labels">
              <span>{formatTime(0)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </section>

          <section className="marker-actions-card">
            <div className="section-heading">
              <div>
                <h2>Kontrol penanda</h2>
                <p>Saat melihat perubahan tombol, tandai posisi video.</p>
              </div>
            </div>
            <div className="marker-input-row">
              <input
                value={newMarkerLabel}
                onChange={(event) => setNewMarkerLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addMarker();
                }}
                placeholder="Nama penanda (opsional), mis. Chord 1"
                disabled={!videoUrl}
                aria-label="Nama penanda baru"
              />
              <button className="button button-primary add-button" onClick={addMarker} disabled={!videoUrl}>
                <BookmarkPlus size={17} /> Tambah penanda <kbd>M</kbd>
              </button>
            </div>
            <div className="navigation-row">
              <button className="button button-secondary" onClick={() => goToMarker(-1)} disabled={markers.length === 0}>
                <ChevronLeft size={18} /> Sebelumnya <kbd>←</kbd>
              </button>
              <button className="button button-secondary" onClick={() => goToMarker(1)} disabled={markers.length === 0}>
                Berikutnya <kbd>→</kbd> <ChevronRight size={18} />
              </button>
              <button className="button button-quiet" onClick={() => seekTo(0)} disabled={!videoUrl} title="Kembali ke awal video">
                <RotateCcw size={16} /> Awal video
              </button>
            </div>
            <p className="shortcut-note">Shortcut: <kbd>Space</kbd> putar/jeda · <kbd>M</kbd> tambah penanda · <kbd>←</kbd>/<kbd>→</kbd> pindah penanda</p>
          </section>
        </section>

        <aside className="sidebar">
          <div className="sidebar-heading">
            <div>
              <h2>Daftar penanda</h2>
              <p>{file ? file.name : "Belum ada video dipilih"}</p>
            </div>
            <div className="list-actions">
              <button className="small-icon-button" onClick={() => markerImportRef.current?.click()} title="Impor penanda JSON">
                <SkipBack size={16} />
              </button>
              <input
                ref={markerImportRef}
                className="visually-hidden"
                id="import-markers"
                type="file"
                accept="application/json,.json"
                onChange={importMarkers}
              />
              <button className="small-icon-button" onClick={exportMarkers} disabled={!file || markers.length === 0} title="Ekspor penanda JSON">
                <SkipForward size={16} />
              </button>
            </div>
          </div>

          {sortedMarkers.length === 0 ? (
            <div className="empty-list">
              <div className="empty-list-icon"><BookmarkPlus size={24} /></div>
              <strong>Belum ada penanda</strong>
              <p>Putar video, jeda saat tombol berubah, lalu tekan <kbd>M</kbd> atau tombol Tambah penanda.</p>
            </div>
          ) : (
            <div className="marker-list">
              {sortedMarkers.map((marker, index) => (
                <div
                  key={marker.id}
                  className={`marker-item ${selectedMarkerId === marker.id ? "active" : ""}`}
                >
                  <button
                    className="marker-jump"
                    onClick={() => {
                      seekTo(marker.time);
                      setSelectedMarkerId(marker.id);
                    }}
                    aria-label={`Lompat ke ${marker.label}`}
                  >
                    <span className="marker-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="marker-item-main">
                      <input
                        value={marker.label}
                        aria-label={`Nama penanda ${index + 1}`}
                        onChange={(event) => updateMarkerLabel(marker.id, event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      />
                      <span className="marker-time">{formatTime(marker.time)}</span>
                    </span>
                  </button>
                  <button
                    className="delete-marker"
                    onClick={() => removeMarker(marker.id)}
                    aria-label={`Hapus ${marker.label}`}
                    title="Hapus penanda"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="sidebar-footer">
            <div className="save-status"><span className="status-dot" /> Tersimpan otomatis di browser</div>
            <p>Penanda disimpan berdasarkan nama, ukuran, dan waktu modifikasi file video.</p>
          </div>
        </aside>
      </div>

      {notice && <div className="toast" role="status">{notice}</div>}
      <footer className="footer">
        <span><FileVideo size={14} /> Video diproses lokal</span>
        <span>Video Marker · versi awal</span>
      </footer>
    </main>
  );
}
