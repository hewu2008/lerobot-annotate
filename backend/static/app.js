console.log('[App] Script starting...');

let toastContainer = null;
function showToast(message, type = 'success', duration = 2500) {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const iconMap = { success: '✓', error: '✗', info: 'ℹ' };
  toast.innerHTML = `<span class="toast-icon">${iconMap[type] || 'ℹ'}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showPushStatus(type, message, url = null) {
  console.log('[Push to Hub] Showing status:', type, message);
  
  const statusEl = document.getElementById('pushHubStatus');
  if (!statusEl) {
    console.error('[Push to Hub] Status element not found');
    alert(`${type}: ${message}`);
    return;
  }
  
  statusEl.className = `helper status-${type}`;
  
  if (type === 'loading') {
    statusEl.innerHTML = `<span class="spinner"></span> ${message}`;
  } else if (type === 'success') {
    statusEl.innerHTML = `
      <div class="status-box status-success">
        <span class="status-icon">✓</span>
        <div class="status-content">
          <strong>Success!</strong>
          <p>${message}</p>
          ${url ? `<a href="${url}" target="_blank" class="status-link">View on Hugging Face Hub →</a>` : ''}
        </div>
      </div>
    `;
  } else if (type === 'error') {
    statusEl.innerHTML = `
      <div class="status-box status-error">
        <span class="status-icon">✗</span>
        <div class="status-content">
          <strong>Error</strong>
          <p>${message}</p>
        </div>
      </div>
    `;
  }
}

async function handlePushToHub() {
  console.log('[Push to Hub] handlePushToHub called');
  
  const tokenEl = document.getElementById('hfToken');
  const statusEl = document.getElementById('pushHubStatus');
  const btnEl = document.getElementById('pushHubBtn');
  const inPlaceEl = document.getElementById('pushInPlace');
  const newRepoEl = document.getElementById('newRepoId');
  const privateEl = document.getElementById('privateRepo');
  const msgEl = document.getElementById('commitMessage');
  
  if (!tokenEl || !statusEl) {
    console.error('[Push to Hub] Missing DOM elements');
    alert('Error: Missing form elements. Please refresh the page.');
    return;
  }
  
  const token = tokenEl.value.trim();
  console.log('[Push to Hub] Token provided:', token ? 'Yes (hidden)' : 'No');
  
  if (!token) {
    showPushStatus('error', 'Please enter your Hugging Face token');
    return;
  }

  const pushInPlaceChecked = inPlaceEl ? inPlaceEl.checked : true;
  const newRepoIdValue = newRepoEl ? newRepoEl.value.trim() : '';
  
  if (!pushInPlaceChecked && !newRepoIdValue) {
    showPushStatus('error', 'Please enter a new repo ID or check "Push to original repo"');
    return;
  }

  // Show loading state
  console.log('[Push to Hub] Starting push...');
  showPushStatus('loading', 'Pushing to Hub... This may take a while for large datasets.');
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '<span class="spinner"></span> Pushing...';
  }

  try {
    const payload = {
      hf_token: token,
      push_in_place: pushInPlaceChecked,
      new_repo_id: pushInPlaceChecked ? null : newRepoIdValue,
      private: privateEl ? privateEl.checked : false,
      commit_message: (msgEl ? msgEl.value.trim() : '') || 'Add annotations from LeRobot Annotate',
    };
    
    console.log('[Push to Hub] Sending request with payload:', { ...payload, hf_token: '[HIDDEN]' });

    const res = await fetch('/api/push_to_hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('[Push to Hub] Response status:', res.status);
    const data = await res.json();
    console.log('[Push to Hub] Response data:', data);
    
    if (res.ok) {
      console.log('[Push to Hub] Success!');
      showPushStatus('success', `${data.message}`, data.url);
    } else {
      console.error('[Push to Hub] Failed:', data.detail);
      showPushStatus('error', data.detail || 'Push failed. Please check your token and try again.');
    }
  } catch (err) {
    console.error('[Push to Hub] Error:', err);
    showPushStatus('error', `Network error: ${err.message}. Please check your connection and try again.`);
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.textContent = 'Push to Hub';
    }
  }
}

console.log('[App] handlePushToHub function defined');
// ============================================

const statusEl = document.getElementById('status');
const connectForm = document.getElementById('connectForm');
const sourceSelect = document.getElementById('sourceSelect');
const repoIdField = document.getElementById('repoIdField');
const revisionField = document.getElementById('revisionField');
const repoInput = document.getElementById('repoInput');
const localInput = document.getElementById('localInput');
const revisionInput = document.getElementById('revisionInput');
const videoKeySelect = document.getElementById('videoKeySelect');
const connectHelper = document.getElementById('connectHelper');

const workspace = document.getElementById('workspace');
const episodeList = document.getElementById('episodeList');
const episodeSearch = document.getElementById('episodeSearch');
const episodeTitle = document.getElementById('episodeTitle');
const episodeMeta = document.getElementById('episodeMeta');
const episodeVideo = document.getElementById('episodeVideo');
const multiVideoGrid = document.getElementById('multiVideoGrid');
const multiVideoControls = document.getElementById('multiVideoControls');
const multiPlayPause = document.getElementById('multiPlayPause');
const multiSeek = document.getElementById('multiSeek');
const multiTimeDisplay = document.getElementById('multiTimeDisplay');
const episodeVideoLoading = document.getElementById('episodeVideoLoading');
const noVideoMessage = document.getElementById('noVideoMessage');
const timeline = document.getElementById('timeline');
const showAllVideos = document.getElementById('showAllVideos');

const saveEpisodeBtn = document.getElementById('saveEpisode');
const resetEpisodeBtn = document.getElementById('resetEpisode');

const subtaskStart = document.getElementById('subtaskStart');
const subtaskEnd = document.getElementById('subtaskEnd');
const subtaskLabel = document.getElementById('subtaskLabel');
const subtaskSetStart = document.getElementById('subtaskSetStart');
const subtaskSetEnd = document.getElementById('subtaskSetEnd');
const addSubtask = document.getElementById('addSubtask');
const subtaskList = document.getElementById('subtaskList');
const subtaskLabelChips = document.getElementById('subtaskLabelChips');

const hlStart = document.getElementById('hlStart');
const hlEnd = document.getElementById('hlEnd');
const hlUser = document.getElementById('hlUser');
const hlRobot = document.getElementById('hlRobot');
const hlSkill = document.getElementById('hlSkill');
const hlScenario = document.getElementById('hlScenario');
const hlResponse = document.getElementById('hlResponse');
const hlSetStart = document.getElementById('hlSetStart');
const hlSetEnd = document.getElementById('hlSetEnd');
const addHighLevel = document.getElementById('addHighLevel');
const highLevelList = document.getElementById('highLevelList');

const taskStart = document.getElementById('taskStart');
const taskEnd = document.getElementById('taskEnd');
const taskStartFrame = document.getElementById('taskStartFrame');
const taskEndFrame = document.getElementById('taskEndFrame');
const taskName = document.getElementById('taskName');
const taskSetStart = document.getElementById('taskSetStart');
const taskSetEnd = document.getElementById('taskSetEnd');
const addTask = document.getElementById('addTask');
const taskLabelChips = document.getElementById('taskLabelChips');

const exportBtn = document.getElementById('exportBtn');
const outputDir = document.getElementById('outputDir');
const copyVideos = document.getElementById('copyVideos');

const trajectorySection = document.getElementById('trajectorySection');
const trajectoryCanvas = document.getElementById('trajectoryCanvas');
const trajectoryEmpty = document.getElementById('trajectoryEmpty');

let trajectoryData = null;
let trajectoryType = 'action';
let trajHiddenDims = new Set();
let trajHoverX = null;
let trajDragging = false;
let trajWasDragging = false;

// Reload video when video key changes
videoKeySelect.addEventListener('change', () => {
  if (state.dataset) {
    state.dataset.selected_video_key = videoKeySelect.value;
    if (state.currentEpisode !== null) {
      selectEpisode(state.currentEpisode);
    }
  }
});

// Toggle multi-camera display
showAllVideos.addEventListener('change', () => {
  if (state.dataset && state.currentEpisode !== null) {
    selectEpisode(state.currentEpisode);
  }
});

// Toggle source-specific fields
function updateSourceFields() {
  const isLocal = sourceSelect.value === 'local';
  repoIdField.style.display = isLocal ? 'none' : '';
  revisionField.style.display = isLocal ? 'none' : '';
}
sourceSelect.addEventListener('change', updateSourceFields);
updateSourceFields();
const exportStatus = document.getElementById('exportStatus');

// Push to Hub elements
const hfToken = document.getElementById('hfToken');
const pushInPlace = document.getElementById('pushInPlace');
const newRepoRow = document.getElementById('newRepoRow');
const newRepoId = document.getElementById('newRepoId');
const privateRepo = document.getElementById('privateRepo');
const commitMessage = document.getElementById('commitMessage');
const pushHubBtn = document.getElementById('pushHubBtn');
const pushHubStatus = document.getElementById('pushHubStatus');

console.log('[App] Push to Hub elements:', { 
  pushHubBtn: !!pushHubBtn, 
  hfToken: !!hfToken, 
  pushHubStatus: !!pushHubStatus,
  pushInPlace: !!pushInPlace 
});

const tabs = document.querySelectorAll('.tab');
const tabPanels = document.querySelectorAll('.tab-panel');

const state = {
  dataset: null,
  episodes: [],
  currentEpisode: null,
  currentEpisodeData: null, // Store the full episode data including video timing
  annotations: {},
};

function setStatus(text, ok = false) {
  statusEl.textContent = text;
  statusEl.style.color = ok ? '#22c55e' : '#f97316';
}

function setHelper(el, message, ok = false) {
  el.textContent = message;
  el.style.color = ok ? '#22c55e' : '#94a3b8';
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

function getPrimaryVideoElement() {
  if (showAllVideos.checked && multiVideoGrid.style.display !== 'none') {
    return multiVideoGrid.querySelector('.video-grid-item.is-primary video');
  }
  return episodeVideo;
}

function currentTime() {
  if (!state.dataset || !state.dataset.selected_video_key) {
    return 0;
  }
  const video = getPrimaryVideoElement();
  if (!video || video.style.display === 'none') {
    return 0;
  }
  return Number(video.currentTime.toFixed(3));
}

function formatTimeWithMs(seconds) {
  // Format time as MM:SS.mmm for millisecond precision display
  if (!seconds && seconds !== 0) return '00:00.000';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function updateTimeDisplay() {
  const currentTimeDisplay = document.getElementById('currentTimeDisplay');
  const totalTimeDisplay = document.getElementById('totalTimeDisplay');
  if (!state.dataset || !state.dataset.selected_video_key) {
    if (currentTimeDisplay) {
      currentTimeDisplay.textContent = '00:00.000';
    }
    if (totalTimeDisplay && state.currentEpisodeData) {
      totalTimeDisplay.textContent = formatTimeWithMs(state.currentEpisodeData.duration);
    }
    return;
  }
  const video = getPrimaryVideoElement();
  if (currentTimeDisplay && video) {
    currentTimeDisplay.textContent = formatTimeWithMs(video.currentTime);
  }
  if (totalTimeDisplay && video && video.duration) {
    totalTimeDisplay.textContent = formatTimeWithMs(video.duration);
  }
}

function getEpisodeDuration() {
  if (!state.dataset || !state.dataset.selected_video_key) {
    if (state.currentEpisodeData && state.currentEpisodeData.duration) {
      return state.currentEpisodeData.duration;
    }
    return 0;
  }
  const video = getPrimaryVideoElement();
  return video ? (video.duration || 0) : 0;
}

function resetEpisodeForm() {
  subtaskStart.value = '';
  subtaskEnd.value = '';
  subtaskLabel.value = '';
  hlStart.value = '';
  hlEnd.value = '';
  hlUser.value = '';
  hlRobot.value = '';
  hlSkill.value = '';
  hlScenario.value = '';
  hlResponse.value = '';
  taskStart.value = '';
  taskEnd.value = '';
  taskStartFrame.value = '';
  taskEndFrame.value = '';
  taskName.value = '';
}

function currentFrame() {
  if (!state.dataset || !state.dataset.fps) return 0;
  return Math.round(currentTime() * state.dataset.fps);
}

function secondsToFrame(sec) {
  if (!state.dataset || !state.dataset.fps) return 0;
  return Math.round(Number(sec) * state.dataset.fps);
}

function frameToSeconds(frame) {
  if (!state.dataset || !state.dataset.fps) return 0;
  return Number(frame) / state.dataset.fps;
}

function getEpisodeAnnotations(epIdx) {
  if (!state.annotations[epIdx]) {
    state.annotations[epIdx] = { subtasks: [], high_levels: [], tasks: [] };
  }
  return state.annotations[epIdx];
}

function isEpisodeAnnotated(epIdx) {
  const ann = state.annotations[epIdx];
  if (!ann) return false;
  return (ann.subtasks && ann.subtasks.length > 0) ||
         (ann.high_levels && ann.high_levels.length > 0) ||
         (ann.tasks && ann.tasks.length > 0);
}

function renderEpisodes() {
  episodeList.innerHTML = '';
  const query = episodeSearch.value.trim();
  const filtered = state.episodes.filter(ep => ep.episode_index.toString().includes(query));
  filtered.forEach(ep => {
    const li = document.createElement('li');
    li.textContent = `Episode ${ep.episode_index}`;
    const span = document.createElement('span');
    span.className = 'duration';
    span.textContent = formatDuration(ep.duration);
    li.appendChild(span);
    if (state.currentEpisode === ep.episode_index) {
      li.classList.add('active');
    }
    if (isEpisodeAnnotated(ep.episode_index)) {
      li.classList.add('annotated');
      li.title = 'Annotated';
    }
    li.addEventListener('click', (e) => {
      if (e.target.classList.contains('episode-delete-btn')) return;
      selectEpisode(ep.episode_index);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'episode-delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.title = `Delete episode ${ep.episode_index}`;
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = confirm(`Delete episode ${ep.episode_index}? This will remove all annotations and exclude it from export.`);
      if (!confirmed) return;
      try {
        const res = await fetch(`/api/episodes/${ep.episode_index}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || 'Failed to delete episode');
        }
        showToast(`Episode ${ep.episode_index} deleted`, 'success');
        state.episodes = state.episodes.filter(e => e.episode_index !== ep.episode_index);
        if (state.currentEpisode === ep.episode_index) {
          state.currentEpisode = null;
          state.currentEpisodeData = null;
          episodeTitle.textContent = 'Select an episode';
          episodeMeta.textContent = '';
          resetEpisodeForm();
        }
        renderEpisodes();
        renderLabelChips();
      } catch (err) {
        showToast(err.message || 'Delete failed', 'error');
      }
    });
    li.appendChild(deleteBtn);

    episodeList.appendChild(li);
  });
}

function renderLabelChips() {
  // Collect unique task names and subtask labels from all annotations
  const taskNames = new Set();
  const subtaskLabels = new Set();
  for (const epAnn of Object.values(state.annotations)) {
    for (const seg of epAnn.tasks || []) {
      if (seg.name) taskNames.add(seg.name);
    }
    for (const seg of epAnn.subtasks || []) {
      if (seg.label) subtaskLabels.add(seg.label);
    }
  }

  // Render task label chips
  if (taskLabelChips) {
    taskLabelChips.innerHTML = '';
    Array.from(taskNames).sort().forEach(name => {
      const chip = document.createElement('span');
      chip.className = 'label-chip';
      chip.textContent = name;
      chip.title = `Fill task label: ${name}`;
      chip.addEventListener('click', () => {
        taskName.value = name;
        taskName.focus();
      });
      taskLabelChips.appendChild(chip);
    });
  }

  // Render subtask label chips
  if (subtaskLabelChips) {
    subtaskLabelChips.innerHTML = '';
    Array.from(subtaskLabels).sort().forEach(label => {
      const chip = document.createElement('span');
      chip.className = 'label-chip';
      chip.textContent = label;
      chip.title = `Fill subtask label: ${label}`;
      chip.addEventListener('click', () => {
        subtaskLabel.value = label;
        subtaskLabel.focus();
      });
      subtaskLabelChips.appendChild(chip);
    });
  }
}

function buildSubtaskIndexMap(annotations) {
  // Build a mapping from label to subtask_index (same logic as backend)
  // This creates consistent subtask indices based on alphabetically sorted unique labels
  const allLabels = new Set();
  for (const epAnn of Object.values(annotations)) {
    for (const seg of epAnn.subtasks || []) {
      if (seg.label) {
        allLabels.add(seg.label);
      }
    }
  }
  const sortedLabels = Array.from(allLabels).sort();
  const subtaskMap = {};
  sortedLabels.forEach((label, idx) => {
    subtaskMap[label] = idx;
  });
  return subtaskMap;
}

function renderTimeline() {
  timeline.innerHTML = '';
  if (state.currentEpisode == null) return;
  const ann = getEpisodeAnnotations(state.currentEpisode);
  const segments = ann.subtasks;
  // Use episode duration (not full video duration) for timeline
  const duration = getEpisodeDuration();
  if (!duration || segments.length === 0) return;

  // Build subtask index map based on all annotations (consistent with export)
  const subtaskMap = buildSubtaskIndexMap(state.annotations);

  segments.forEach((seg) => {
    const span = document.createElement('span');
    const width = ((seg.end - seg.start) / duration) * 100;
    span.style.width = `${Math.max(width, 2)}%`;
    // Get the actual subtask_index based on label
    const subtaskIndex = subtaskMap[seg.label] ?? '?';
    span.title = `subtask_index ${subtaskIndex}: ${seg.label} (${seg.start}s - ${seg.end}s)`;
    // Add subtask index as text inside the span
    span.textContent = subtaskIndex;
    span.style.display = 'flex';
    span.style.alignItems = 'center';
    span.style.justifyContent = 'center';
    span.style.fontSize = '10px';
    span.style.fontWeight = '600';
    span.style.color = '#0b0e14';
    timeline.appendChild(span);
  });
}

function renderSubtasks() {
  subtaskList.innerHTML = '';
  if (state.currentEpisode == null) return;
  const ann = getEpisodeAnnotations(state.currentEpisode);
  ann.subtasks.sort((a, b) => a.start - b.start);

  // Build subtask index map based on all annotations (consistent with export)
  const subtaskMap = buildSubtaskIndexMap(state.annotations);

  ann.subtasks.forEach((seg, idx) => {
    const row = document.createElement('div');
    row.className = 'segment-item';

    // Add subtask_index badge
    const indexBadge = document.createElement('span');
    const subtaskIndex = subtaskMap[seg.label] ?? '?';
    indexBadge.textContent = subtaskIndex;
    indexBadge.title = `subtask_index: ${subtaskIndex}`;
    indexBadge.style.cssText = 'display: flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; background: var(--accent-2); color: #0b0e14; border-radius: 6px; font-weight: 600; font-size: 12px;';

    const startInput = document.createElement('input');
    startInput.type = 'number';
    startInput.step = '0.001';
    startInput.value = seg.start;
    startInput.addEventListener('change', () => {
      seg.start = Number(startInput.value);
      renderTimeline();
    });

    const endInput = document.createElement('input');
    endInput.type = 'number';
    endInput.step = '0.001';
    endInput.value = seg.end;
    endInput.addEventListener('change', () => {
      seg.end = Number(endInput.value);
      renderTimeline();
    });

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = seg.label;
    labelInput.addEventListener('change', () => {
      seg.label = labelInput.value;
      // Re-render both to update subtask_index based on new label
      renderSubtasks();
      renderTimeline();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'ghost';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      ann.subtasks.splice(idx, 1);
      renderSubtasks();
      renderTimeline();
    });

    row.appendChild(indexBadge);
    row.appendChild(startInput);
    row.appendChild(endInput);
    row.appendChild(labelInput);
    row.appendChild(deleteBtn);

    subtaskList.appendChild(row);
  });
}

function renderHighLevels() {
  highLevelList.innerHTML = '';
  if (state.currentEpisode == null) return;
  const ann = getEpisodeAnnotations(state.currentEpisode);
  ann.high_levels.sort((a, b) => a.start - b.start);

  ann.high_levels.forEach((seg, idx) => {
    const row = document.createElement('div');
    row.className = 'segment-item';

    const startInput = document.createElement('input');
    startInput.type = 'number';
    startInput.step = '0.001';
    startInput.value = seg.start;
    startInput.addEventListener('change', () => {
      seg.start = Number(startInput.value);
    });

    const endInput = document.createElement('input');
    endInput.type = 'number';
    endInput.step = '0.001';
    endInput.value = seg.end;
    endInput.addEventListener('change', () => {
      seg.end = Number(endInput.value);
    });

    const promptInput = document.createElement('input');
    promptInput.type = 'text';
    promptInput.value = seg.user_prompt;
    promptInput.addEventListener('change', () => {
      seg.user_prompt = promptInput.value;
    });

    const robotInput = document.createElement('input');
    robotInput.type = 'text';
    robotInput.value = seg.robot_utterance;
    robotInput.addEventListener('change', () => {
      seg.robot_utterance = robotInput.value;
    });

    const skillInput = document.createElement('input');
    skillInput.type = 'text';
    skillInput.value = seg.skill || '';
    skillInput.addEventListener('change', () => {
      seg.skill = skillInput.value;
    });

    const scenarioInput = document.createElement('input');
    scenarioInput.type = 'text';
    scenarioInput.value = seg.scenario_type || '';
    scenarioInput.addEventListener('change', () => {
      seg.scenario_type = scenarioInput.value;
    });

    const responseInput = document.createElement('input');
    responseInput.type = 'text';
    responseInput.value = seg.response_type || '';
    responseInput.addEventListener('change', () => {
      seg.response_type = responseInput.value;
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'ghost';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      ann.high_levels.splice(idx, 1);
      renderHighLevels();
    });

    row.appendChild(startInput);
    row.appendChild(endInput);
    row.appendChild(promptInput);
    row.appendChild(robotInput);
    row.appendChild(skillInput);
    row.appendChild(scenarioInput);
    row.appendChild(responseInput);
    row.appendChild(deleteBtn);

    highLevelList.appendChild(row);
  });
}

function renderTasks() {
  // Task annotation is now displayed inline in the form, not as a list.
  // Kept as no-op for compatibility.
}

async function renderMultiCameraGrid(epIdx) {
  const videoKeys = state.dataset?.video_keys || [];
  if (!videoKeys.length) return;

  multiVideoGrid.innerHTML = '';
  multiVideoGrid.style.display = '';
  multiVideoControls.style.display = '';
  episodeVideo.style.display = 'none';
  episodeVideoLoading.style.display = '';

  const primaryKey = state.dataset.selected_video_key;
  let primaryVideo = null;
  const secondaryVideos = [];

  videoKeys.forEach(key => {
    const item = document.createElement('div');
    item.className = 'video-grid-item';
    if (key === primaryKey) item.classList.add('is-primary');

    const label = document.createElement('div');
    label.className = 'video-label';
    let labelText = key;
    if (key.startsWith('observation.images.')) {
      labelText = key.replace('observation.images.', '');
    } else if (key.startsWith('videos/')) {
      labelText = key.replace('videos/', '');
    }
    label.textContent = labelText;

    const video = document.createElement('video');
    // No native controls on any video; the unified bar drives playback
    video.controls = false;
    video.preload = 'metadata';
    video.src = `/api/video/${epIdx}?video_key=${encodeURIComponent(key)}`;
    video.muted = key !== primaryKey;

    item.appendChild(video);
    item.appendChild(label);
    multiVideoGrid.appendChild(item);

    if (key === primaryKey) {
      primaryVideo = video;
    } else {
      secondaryVideos.push(video);
    }
  });

  // Guard against feedback loops when syncing
  let isSyncing = false;

  // Unified control bar drives the primary video
  const setPlayPauseIcon = () => {
    multiPlayPause.innerHTML = primaryVideo.paused ? '&#9654;' : '&#10073;&#10073;';
  };

  const updateSeekBar = () => {
    const dur = primaryVideo.duration || 0;
    const cur = primaryVideo.currentTime || 0;
    if (dur > 0) {
      multiSeek.value = String(Math.round((cur / dur) * 1000));
    }
    multiTimeDisplay.textContent = `${formatTimeWithMs(cur)} / ${formatTimeWithMs(dur)}`;
  };

  multiPlayPause.onclick = () => {
    if (primaryVideo.paused) {
      primaryVideo.play();
    } else {
      primaryVideo.pause();
    }
  };

  multiSeek.oninput = () => {
    const dur = primaryVideo.duration || 0;
    if (dur > 0) {
      primaryVideo.currentTime = (Number(multiSeek.value) / 1000) * dur;
    }
    if (trajectoryData) drawTrajectory();
  };

  // Primary video events -> update control bar + sync secondaries
  primaryVideo.addEventListener('loadedmetadata', () => {
    renderTimeline();
    updateTimeDisplay();
    updateSeekBar();
    setPlayPauseIcon();
  });
  primaryVideo.addEventListener('timeupdate', () => {
    updateTimeDisplay();
    updateSeekBar();
    if (trajectoryData) drawTrajectory();
  });
  primaryVideo.addEventListener('play', () => {
    setPlayPauseIcon();
    if (isSyncing) return;
    isSyncing = true;
    secondaryVideos.forEach(v => v.play().catch(() => {}));
    isSyncing = false;
  });
  primaryVideo.addEventListener('pause', () => {
    setPlayPauseIcon();
    if (isSyncing) return;
    isSyncing = true;
    secondaryVideos.forEach(v => v.pause());
    isSyncing = false;
  });
  primaryVideo.addEventListener('seeked', () => {
    updateSeekBar();
    if (isSyncing) return;
    isSyncing = true;
    const t = primaryVideo.currentTime;
    secondaryVideos.forEach(v => { v.currentTime = t; });
    isSyncing = false;
  });
  primaryVideo.addEventListener('ratechange', () => {
    const rate = primaryVideo.playbackRate;
    secondaryVideos.forEach(v => { v.playbackRate = rate; });
  });

  // Initial state
  setPlayPauseIcon();
  updateSeekBar();

  // Hide loading when all videos have started loading
  let loadedCount = 0;
  const totalVideos = videoKeys.length;
  multiVideoGrid.querySelectorAll('video').forEach(v => {
    v.addEventListener('loadeddata', () => {
      loadedCount++;
      if (loadedCount >= totalVideos) {
        episodeVideoLoading.style.display = 'none';
      }
    }, { once: true });
    v.addEventListener('error', () => {
      loadedCount++;
      if (loadedCount >= totalVideos) {
        episodeVideoLoading.style.display = 'none';
      }
    }, { once: true });
  });
}

function hideMultiCameraGrid() {
  multiVideoGrid.innerHTML = '';
  multiVideoGrid.style.display = 'none';
  multiVideoControls.style.display = 'none';
}

async function selectEpisode(epIdx) {
  state.currentEpisode = epIdx;
  episodeTitle.textContent = `Episode ${epIdx}`;
  const ep = state.episodes.find(e => e.episode_index === epIdx);
  state.currentEpisodeData = ep || null;
  episodeMeta.textContent = ep ? `${ep.length} frames • ${formatDuration(ep.duration)}` : '';

  const res = await fetch(`/api/episodes/${epIdx}/annotations`);
  const data = await res.json();
  state.annotations[epIdx] = {
    subtasks: data.subtasks || [],
    high_levels: data.high_levels || [],
    tasks: data.tasks || [],
  };

  // Load video only if the dataset has video keys
  if (state.dataset && state.dataset.selected_video_key) {
    noVideoMessage.style.display = 'none';

    if (showAllVideos.checked && state.dataset.video_keys.length > 1) {
      episodeVideo.style.display = 'none';
      await renderMultiCameraGrid(epIdx);
    } else {
      hideMultiCameraGrid();
      const videoUrl = `/api/video/${epIdx}?video_key=${encodeURIComponent(state.dataset.selected_video_key)}`;
      console.log(`Loading episode ${epIdx} video`);
      episodeVideo.src = videoUrl;
      episodeVideo.style.display = '';
      episodeVideoLoading.style.display = '';
      episodeVideo.addEventListener('loadeddata', () => {
        episodeVideoLoading.style.display = 'none';
      }, { once: true });
    }
  } else {
    // No video available for this dataset
    hideMultiCameraGrid();
    episodeVideo.removeAttribute('src');
    episodeVideo.load();
    episodeVideo.style.display = 'none';
    noVideoMessage.style.display = '';
    episodeVideoLoading.style.display = 'none';
  }
  
  resetEpisodeForm();

  // Populate task form directly from annotations (inline, not list)
  const epData = state.currentEpisodeData;
  if (epData) {
    const fps = state.dataset?.fps || 30;
    const fullStart = 0;
    const fullEnd = epData.duration || 0;
    const fullStartFrame = 0;
    const fullEndFrame = epData.length || (fps > 0 ? Math.round(fullEnd * fps) : 0);

    // Pre-fill task label from episodes.jsonl if available
    let taskLabelFromMeta = epData.task_label || epData.task_name || epData.task || '';
    // Handle "tasks" field which is an array of task strings (LeRobot v2.0 format)
    if (!taskLabelFromMeta && epData.tasks) {
      if (Array.isArray(epData.tasks)) {
        taskLabelFromMeta = epData.tasks.join('; ');
      } else if (typeof epData.tasks === 'string') {
        taskLabelFromMeta = epData.tasks;
      }
    }

    const ann = state.annotations[epIdx];
    if (ann.tasks && ann.tasks.length > 0) {
      // Show existing task annotation directly in form fields
      const t = ann.tasks[0];
      taskStart.value = Number(t.start).toFixed(3);
      taskEnd.value = Number(t.end).toFixed(3);
      taskStartFrame.value = Math.round(Number(t.start) * fps);
      taskEndFrame.value = Math.round(Number(t.end) * fps);
      taskName.value = t.name || (taskLabelFromMeta || '');
    } else {
      // No task yet: pre-fill with full episode defaults and label from metadata
      taskStart.value = Number(fullStart).toFixed(3);
      taskEnd.value = Number(fullEnd).toFixed(3);
      taskStartFrame.value = fullStartFrame;
      taskEndFrame.value = fullEndFrame;
      taskName.value = taskLabelFromMeta || '';
    }
  }

  renderEpisodes();
  renderSubtasks();
  renderHighLevels();
  renderLabelChips();
  loadTrajectory(epIdx);
}

async function loadTrajectory(epIdx) {
  try {
    const res = await fetch(`/api/episodes/${epIdx}/trajectory`);
    if (!res.ok) throw new Error('Failed to load trajectory');
    trajectoryData = await res.json();
    trajectorySection.style.display = '';
    drawTrajectory();
  } catch (err) {
    console.warn('[Trajectory] No data:', err);
    trajectoryData = null;
    trajectorySection.style.display = 'none';
  }
}

function drawTrajectory() {
  const canvas = trajectoryCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width;
  const cssH = 220;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.height = cssH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const w = cssW;
  const h = cssH;
  ctx.clearRect(0, 0, w, h);

  if (!trajectoryData) return;

  const data = trajectoryType === 'action' ? trajectoryData.action : trajectoryData.state;
  if (!data || Object.keys(data).length === 0) {
    trajectoryEmpty.style.display = '';
    return;
  }
  trajectoryEmpty.style.display = 'none';

  const allKeys = Object.keys(data);
  const keys = allKeys.filter(k => !trajHiddenDims.has(k));
  if (keys.length === 0) return;

  const nFrames = trajectoryData.num_frames;
  const duration = trajectoryData.duration;
  const fps = trajectoryData.fps || 30;

  const padL = 55, padR = 15, padT = 38, padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  let globalMin = Infinity, globalMax = -Infinity;
  keys.forEach(k => {
    const vals = data[k].filter(v => v !== null && v !== undefined && !isNaN(v));
    if (vals.length) {
      const mn = Math.min(...vals);
      const mx = Math.max(...vals);
      if (mn < globalMin) globalMin = mn;
      if (mx > globalMax) globalMax = mx;
    }
  });
  if (!isFinite(globalMin)) { globalMin = -1; globalMax = 1; }
  if (globalMax - globalMin < 1e-6) { globalMin -= 1; globalMax += 1; }

  const yToPx = v => padT + plotH - ((v - globalMin) / (globalMax - globalMin)) * plotH;
  const pxToFrame = px => Math.round(((px - padL) / plotW) * (nFrames - 1));
  const frameToPx = i => padL + (i / Math.max(1, nFrames - 1)) * plotW;
  const pxToTime = px => ((px - padL) / plotW) * duration;

  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#64748b';

  for (let i = 0; i <= 4; i++) {
    const y = padT + (plotH * i / 4);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
    const val = globalMax - ((globalMax - globalMin) * i / 4);
    ctx.fillStyle = '#64748b';
    ctx.fillText(val.toFixed(3), 2, y + 3);
  }

  ctx.fillStyle = '#64748b';
  for (let i = 0; i <= 6; i++) {
    const x = padL + (plotW * i / 6);
    const t = (duration * i / 6);
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.strokeStyle = '#151a26';
    ctx.stroke();
    const label = t >= 60 ? `${Math.floor(t / 60)}m${Math.floor(t % 60)}s` : `${t.toFixed(1)}s`;
    ctx.fillText(label, x - 14, h - 8);
  }

  const colors = [
    '#f97316', '#22c55e', '#3b82f6', '#ec4899', '#a855f7',
    '#14b8a6', '#eab308', '#ef4444', '#06b6d4', '#8b5cf6',
    '#f43f5e', '#84cc16', '#0ea5e9', '#d946ef', '#f59e0b',
    '#2dd4bf', '#6366f1', '#e11d48', '#10b981', '#6366f1',
    '#a3e635', '#fda4af', '#f0abfc', '#93c5fd', '#fde68a',
  ];

  keys.forEach((key) => {
    const origIdx = allKeys.indexOf(key);
    const color = colors[origIdx % colors.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.85;
    const vals = data[key];
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (v === null || v === undefined || isNaN(v)) { started = false; continue; }
      const x = frameToPx(i);
      const y = yToPx(v);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  const visibleCount = keys.length;
  const cols = Math.min(5, visibleCount);
  const colW = plotW / cols;
  ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
  keys.forEach((key, idx) => {
    const origIdx = allKeys.indexOf(key);
    const color = colors[origIdx % colors.length];
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const lx = padL + col * colW + 4;
    const ly = 4 + row * 12;
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly, 7, 7);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(key.length > 13 ? key.slice(0, 13) : key, lx + 10, ly + 8);
  });

  const video = getPrimaryVideoElement();
  const videoTime = video ? video.currentTime : 0;
  const videoFrameIdx = Math.round(videoTime * fps);
  const videoPx = frameToPx(Math.min(videoFrameIdx, nFrames - 1));

  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(videoPx, padT);
  ctx.lineTo(videoPx, padT + plotH);
  ctx.stroke();

  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(videoPx, padT, 4, 0, Math.PI * 2);
  ctx.fill();

  if (trajHoverX !== null && trajHoverX >= padL && trajHoverX <= w - padR) {
    const time = pxToTime(trajHoverX);
    const frameIdx = pxToFrame(trajHoverX);
    if (!trajDragging) {
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(trajHoverX, padT);
      ctx.lineTo(trajHoverX, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const timeLabel = formatTimeWithMs(time);
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
    const tw = ctx.measureText(timeLabel).width + 8;
    let bx = trajHoverX + 6;
    if (bx + tw > w - padR) bx = trajHoverX - tw - 6;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    const br = 4;
    const by = padT - 16;
    ctx.moveTo(bx + br, by);
    ctx.lineTo(bx + tw - br, by);
    ctx.quadraticCurveTo(bx + tw, by, bx + tw, by + br);
    ctx.lineTo(bx + tw, by + 14 - br);
    ctx.quadraticCurveTo(bx + tw, by + 14, bx + tw - br, by + 14);
    ctx.lineTo(bx + br, by + 14);
    ctx.quadraticCurveTo(bx, by + 14, bx, by + 14 - br);
    ctx.lineTo(bx, by + br);
    ctx.quadraticCurveTo(bx, by, bx + br, by);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0b0e14';
    ctx.fillText(timeLabel, bx + 4, by + 11);

    if (!trajDragging) {
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      let tooltipParts = [];
      keys.forEach((key) => {
        const origIdx = allKeys.indexOf(key);
        const color = colors[origIdx % colors.length];
        const v = data[key][frameIdx];
        if (v !== null && v !== undefined && !isNaN(v)) {
          tooltipParts.push({ label: key, value: v, color });
        }
      });
      if (tooltipParts.length > 0 && tooltipParts.length <= 12) {
        const tx = trajHoverX + 10;
        let ty = padT + 4;
        const boxW = 140;
        const boxH = tooltipParts.length * 13 + 6;
        let fx = tx;
        if (fx + boxW > w - padR) fx = trajHoverX - boxW - 10;
        ctx.fillStyle = 'rgba(15, 20, 30, 0.92)';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(fx, ty, boxW, boxH, 4);
        ctx.fill();
        ctx.stroke();
        tooltipParts.forEach((p, i) => {
          const ry = ty + 15 + i * 13;
          ctx.fillStyle = p.color;
          ctx.fillRect(fx + 6, ry - 7, 7, 7);
          ctx.fillStyle = '#cbd5e1';
          const label = p.label.length > 10 ? p.label.slice(0, 10) : p.label;
          ctx.fillText(label, fx + 18, ry);
          ctx.fillStyle = '#f1f5f9';
          ctx.textAlign = 'right';
          ctx.fillText(p.value.toFixed(3), fx + boxW - 6, ry);
          ctx.textAlign = 'left';
        });
      }
    }
  }
}

function formatTimeWithMs(seconds) {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

async function saveEpisode() {
  if (state.currentEpisode == null) return false;
  const ann = getEpisodeAnnotations(state.currentEpisode);
  const payload = {
    episode_index: state.currentEpisode,
    subtasks: ann.subtasks,
    high_levels: ann.high_levels,
    tasks: ann.tasks,
  };

  const btnEl = document.getElementById('saveEpisode');
  btnEl.disabled = true;
  btnEl.textContent = 'Saving...';

  try {
    const res = await fetch(`/api/episodes/${state.currentEpisode}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMsg = 'Save failed';
      try {
        const errData = await res.json();
        errorMsg = errData.detail || errorMsg;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    showToast('Episode saved successfully', 'success');
    renderEpisodes();
    renderLabelChips();
    return true;
  } catch (err) {
    console.error('[Save Episode] Error:', err);
    showToast(err.message || 'Save failed', 'error');
    return false;
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = 'Save episode';
  }
}

connectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    source: sourceSelect.value,
    repo_id: repoInput.value.trim() || null,
    revision: revisionInput.value.trim() || null,
    local_path: localInput.value.trim() || null,
    video_key: videoKeySelect.value || null,
  };

  setHelper(connectHelper, 'Loading dataset...');
  try {
    const res = await fetch('/api/dataset/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to load dataset');
    }
    state.dataset = data;
    state.episodes = data.episodes || [];
    setStatus(`Loaded ${data.repo_id || data.root}`, true);
    setHelper(connectHelper, `Loaded ${state.episodes.length} episodes.`, true);
    workspace.style.display = 'grid';
    populateVideoKeys(data.video_keys, data.selected_video_key);
    hideMultiCameraGrid();
    // Show no-video message if dataset has no video
    if (data.selected_video_key) {
      noVideoMessage.style.display = 'none';
      episodeVideo.style.display = 'none';  // Will show when episode is selected
    } else {
      noVideoMessage.style.display = '';
      episodeVideo.style.display = 'none';
    }
    renderEpisodes();
    renderLabelChips();
  } catch (err) {
    setStatus('Disconnected');
    setHelper(connectHelper, err.message);
  }
});

function populateVideoKeys(keys, selected) {
  videoKeySelect.innerHTML = '';
  if (!keys || keys.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No video keys (no video available)';
    option.disabled = true;
    videoKeySelect.appendChild(option);
    return;
  }
  keys.forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    // Show a shortened, more readable label
    let label = key;
    if (key.startsWith('observation.images.')) {
      label = key.replace('observation.images.', '');
    } else if (key.startsWith('videos/')) {
      label = key.replace('videos/', '');
    }
    option.textContent = label;
    option.title = key;  // Show full key on hover
    if (key === selected) option.selected = true;
    videoKeySelect.appendChild(option);
  });
}

subtaskSetStart.addEventListener('click', () => {
  subtaskStart.value = currentTime();
});

subtaskSetEnd.addEventListener('click', () => {
  subtaskEnd.value = currentTime();
});

addSubtask.addEventListener('click', () => {
  if (state.currentEpisode == null) return;
  const start = Number(subtaskStart.value);
  const end = Number(subtaskEnd.value);
  const label = subtaskLabel.value.trim();
  if (!label || Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return;
  }
  const ann = getEpisodeAnnotations(state.currentEpisode);
  ann.subtasks.push({ start, end, label });
  renderSubtasks();
  renderTimeline();
  renderEpisodes();
  renderLabelChips();
  subtaskLabel.value = '';
});

hlSetStart.addEventListener('click', () => {
  hlStart.value = currentTime();
});

hlSetEnd.addEventListener('click', () => {
  hlEnd.value = currentTime();
});

addHighLevel.addEventListener('click', () => {
  if (state.currentEpisode == null) return;
  const start = Number(hlStart.value);
  const end = Number(hlEnd.value);
  const userPrompt = hlUser.value.trim();
  const robotUtter = hlRobot.value.trim();
  if (!userPrompt || !robotUtter || Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return;
  }
  const ann = getEpisodeAnnotations(state.currentEpisode);
  ann.high_levels.push({
    start,
    end,
    user_prompt: userPrompt,
    robot_utterance: robotUtter,
    skill: hlSkill.value.trim() || null,
    scenario_type: hlScenario.value.trim() || null,
    response_type: hlResponse.value.trim() || null,
  });
  renderHighLevels();
  renderEpisodes();
  hlUser.value = '';
  hlRobot.value = '';
});

taskSetStart.addEventListener('click', () => {
  taskStart.value = currentTime();
  taskStartFrame.value = currentFrame();
});

taskSetEnd.addEventListener('click', () => {
  taskEnd.value = currentTime();
  taskEndFrame.value = currentFrame();
});

// Two-way sync between seconds and frames for task form
taskStart.addEventListener('input', () => {
  const sec = Number(taskStart.value);
  if (!Number.isNaN(sec) && state.dataset?.fps) {
    taskStartFrame.value = Math.round(sec * state.dataset.fps);
  }
});
taskStartFrame.addEventListener('input', () => {
  const frame = Number(taskStartFrame.value);
  if (!Number.isNaN(frame) && state.dataset?.fps) {
    taskStart.value = (frame / state.dataset.fps).toFixed(3);
  }
});
taskEnd.addEventListener('input', () => {
  const sec = Number(taskEnd.value);
  if (!Number.isNaN(sec) && state.dataset?.fps) {
    taskEndFrame.value = Math.round(sec * state.dataset.fps);
  }
});
taskEndFrame.addEventListener('input', () => {
  const frame = Number(taskEndFrame.value);
  if (!Number.isNaN(frame) && state.dataset?.fps) {
    taskEnd.value = (frame / state.dataset.fps).toFixed(3);
  }
});

addTask.addEventListener('click', async () => {
  if (state.currentEpisode == null) return;
  const start = Number(taskStart.value);
  const end = Number(taskEnd.value);
  const name = taskName.value.trim();
  if (!name || Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return;
  }
  const ann = getEpisodeAnnotations(state.currentEpisode);
  ann.tasks = [{ start, end, name }];
  const ok = await saveEpisode();
  if (ok) {
    renderEpisodes();
    renderLabelChips();
  }
});

saveEpisodeBtn.addEventListener('click', () => saveEpisode());
resetEpisodeBtn.addEventListener('click', () => {
  if (state.currentEpisode == null) return;
  state.annotations[state.currentEpisode] = { subtasks: [], high_levels: [], tasks: [] };
  renderSubtasks();
  renderHighLevels();
  renderTimeline();
  renderEpisodes();
  renderLabelChips();
  // Reset task form to episode defaults
  const epData = state.currentEpisodeData;
  if (epData) {
    const fps = state.dataset?.fps || 30;
    taskStart.value = Number(0).toFixed(3);
    taskEnd.value = Number(epData.duration || 0).toFixed(3);
    taskStartFrame.value = 0;
    taskEndFrame.value = epData.length || (fps > 0 ? Math.round((epData.duration || 0) * fps) : 0);
  }
});

episodeSearch.addEventListener('input', renderEpisodes);

episodeVideo.addEventListener('loadedmetadata', () => {
  // Server now returns trimmed videos, just render the timeline
  renderTimeline();
  updateTimeDisplay();
});

// Update time display continuously during video playback
episodeVideo.addEventListener('timeupdate', () => {
  updateTimeDisplay();
  if (trajectoryData) drawTrajectory();
});

document.querySelectorAll('input[name="trajType"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    trajectoryType = e.target.value;
    drawTrajectory();
  });
});

window.addEventListener('resize', () => {
  if (trajectoryData) drawTrajectory();
});

trajectoryCanvas.addEventListener('mousedown', (e) => {
  if (!trajectoryData) return;
  const rect = trajectoryCanvas.getBoundingClientRect();
  const downX = e.clientX - rect.left;
  const downY = e.clientY - rect.top;
  const padL = 55, padR = 15, padT = 38;

  if (downY >= padT && downX >= padL && downX <= rect.width - padR) {
    trajDragging = true;
    trajectoryCanvas.style.cursor = 'grabbing';
    const duration = trajectoryData.duration;
    const plotW = rect.width - padL - padR;
    const time = ((downX - padL) / plotW) * duration;
    const video = getPrimaryVideoElement();
    if (video) {
      video.currentTime = Math.max(0, Math.min(duration, time));
    }
    trajHoverX = downX;
    drawTrajectory();
    e.preventDefault();
  }
});

trajectoryCanvas.addEventListener('mousemove', (e) => {
  if (!trajectoryData) return;
  const rect = trajectoryCanvas.getBoundingClientRect();
  const moveX = e.clientX - rect.left;
  const moveY = e.clientY - rect.top;
  const padL = 55, padR = 15, padT = 38;

  if (trajDragging) {
    if (moveX >= padL && moveX <= rect.width - padR) {
      const duration = trajectoryData.duration;
      const plotW = rect.width - padL - padR;
      const time = ((moveX - padL) / plotW) * duration;
      const video = getPrimaryVideoElement();
      if (video) {
        video.currentTime = Math.max(0, Math.min(duration, time));
      }
      trajHoverX = moveX;
      drawTrajectory();
    }
  } else {
    if (moveY >= padT && moveX >= padL && moveX <= rect.width - padR) {
      trajectoryCanvas.style.cursor = 'grab';
    } else {
      trajectoryCanvas.style.cursor = 'crosshair';
    }
    trajHoverX = moveX;
    drawTrajectory();
  }
});

document.addEventListener('mouseup', () => {
  if (trajDragging) {
    trajDragging = false;
    trajWasDragging = true;
    trajectoryCanvas.style.cursor = 'crosshair';
  }
});

trajectoryCanvas.addEventListener('mouseleave', () => {
  if (!trajDragging) {
    trajHoverX = null;
    drawTrajectory();
  }
});

trajectoryCanvas.addEventListener('click', (e) => {
  if (trajWasDragging) {
    trajWasDragging = false;
    e.preventDefault();
    return;
  }
  if (!trajectoryData) return;
  const rect = trajectoryCanvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const data = trajectoryType === 'action' ? trajectoryData.action : trajectoryData.state;
  if (!data) return;

  const allKeys = Object.keys(data);
  const padL = 55, padR = 15, padT = 38;

  if (clickY < padT && clickX >= padL) {
    const relX = clickX - padL;
    const plotW = rect.width - padL - padR;
    const cols = Math.min(5, allKeys.length);
    const colW = plotW / cols;
    const colIdx = Math.floor(relX / colW);
    const rowIdx = Math.floor((clickY - 4) / 12);
    const keyIdx = rowIdx * cols + colIdx;
    if (keyIdx >= 0 && keyIdx < allKeys.length) {
      const key = allKeys[keyIdx];
      if (trajHiddenDims.has(key)) trajHiddenDims.delete(key);
      else trajHiddenDims.add(key);
      drawTrajectory();
      return;
    }
  }
});

function syncEpisodesHeight() {
  const viewer = document.querySelector('.viewer');
  const episodes = document.querySelector('.episodes');
  if (!viewer || !episodes) return;
  const h = viewer.getBoundingClientRect().height;
  episodes.style.maxHeight = h + 'px';
}

window.addEventListener('load', () => {
  syncEpisodesHeight();
  const observer = new ResizeObserver(() => syncEpisodesHeight());
  const viewer = document.querySelector('.viewer');
  if (viewer) observer.observe(viewer);
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById(`${tab.dataset.tab}Panel`);
    if (panel) panel.classList.add('active');
  });
});

exportBtn.addEventListener('click', async () => {
  exportStatus.textContent = 'Exporting...';
  const payload = {
    output_dir: outputDir.value.trim() || null,
    copy_videos: copyVideos.checked,
  };
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (res.ok) {
    exportStatus.textContent = `Exported to ${data.output_dir} (subtasks: ${data.subtasks}, high-level: ${data.tasks_high_level}, tasks: ${data.tasks})`;
  } else {
    exportStatus.textContent = data.detail || 'Export failed';
  }
});

// Toggle new repo input visibility based on push in place checkbox
if (pushInPlace && newRepoRow) {
  pushInPlace.addEventListener('change', () => {
    newRepoRow.style.display = pushInPlace.checked ? 'none' : 'flex';
  });
  // Initialize visibility
  newRepoRow.style.display = pushInPlace.checked ? 'none' : 'flex';
}

workspace.style.display = 'none';
if (pushHubBtn) {
  console.log('[App] Attaching event listener to pushHubBtn');
  pushHubBtn.addEventListener('click', handlePushToHub);
} else {
  console.error('[App] pushHubBtn element not found');
}
console.log('[App] Script fully loaded and initialized');
