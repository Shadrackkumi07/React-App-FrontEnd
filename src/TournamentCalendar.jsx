import React, { useState, useRef, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from "./contexts/AuthContext";
import CommentList from './components/CommentList';
import LikeButton from './components/LikeButton';


import { auth } from "./firebase";
import './calendar.css';

export default function TournamentCalendar({
  apiEndpoint = '/api/tournaments'
}) {
  // ——— Preserve view on app-triggered reload, default to today on manual reload ———
  const updateViewFlag = sessionStorage.getItem('updateView');
  const storedDateStr = updateViewFlag
    ? sessionStorage.getItem('currentCalendarDate')
    : null;
  const initialCalendarDate = storedDateStr
    ? new Date(storedDateStr)
    : new Date();
  if (updateViewFlag) {
    sessionStorage.removeItem('updateView');
    sessionStorage.removeItem('currentCalendarDate');
  }

  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    image: null,
    startTime: '',
    endTime: '',
    note: '',
    platforms: [],
    links: [{ name: '', url: '' }],
  });

  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [editingTournamentId, setEditingTournamentId] = useState(null);

  const calendarRef = useRef(null);
  const baseURL = process.env.REACT_APP_API_URL || '';

  // ——— Hoisted click handler for creating new tournament on a date ———
  function handleDateClick(arg) {
    setSelectedDate(arg.dateStr);
    setShowForm(true);
    setEditingTournamentId(null);
    setFormData({
      title: '',
      image: null,
      startTime: '',
      endTime: '',
      note: '',
      platforms: [],
      links: [{ name: '', url: '' }],
    });
  }

  // ——— Attach “+” buttons & cell click handlers ———
  const attachDayCellListeners = useCallback(() => {
    document.querySelectorAll('.fc-daygrid-day').forEach(el => {
      const date = el.getAttribute('data-date');
      el.style.position = 'relative';

      if (!el.querySelector('.add-btn')) {
        const btn = document.createElement('button');
        btn.textContent = '+';
        btn.className =
          'add-btn hidden absolute top-1 left-1 bg-blue-600 text-white rounded-full w-6 h-6 text-sm';
        btn.onclick = e => {
          e.stopPropagation();
          handleDateClick({ dateStr: date });
        };
        el.appendChild(btn);
      }
      el.onmouseenter = () => {
        el.querySelector('.add-btn')?.classList.remove('hidden');
      };
      el.onmouseleave = () => {
        el.querySelector('.add-btn')?.classList.add('hidden');
      };
      el.onclick = () => {
        setModalDate(date);
        setShowDetailModal(true);
      };
    });
  }, []);

  const handleDatesSet = () => {
    // wait for FullCalendar DOM update
    setTimeout(attachDayCellListeners, 50);
  };

  
  const fetchAllTournaments = useCallback(async () => {
    try {
      const headers = {};
      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }
  
      const res  = await fetch(`${baseURL}${apiEndpoint}`, { headers });
  
      if (!res.ok) {
        console.error("GET /api/tournaments failed:", res.status);
        setEvents([]);      // clear list on error
        return;
      }
  
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error("Response not array:", data);
        setEvents([]);
        return;
      }
  
      const mapped = data.map(t => ({
        title: t.title,
        date:  t.date,
        extendedProps: {
          _id:        t._id,
          createdBy:  t.createdBy,
          fullTitle:  t.title,
          startTime:  t.startTime,
          endTime:    t.endTime,
          image:      t.image,
          note:       t.note,
          platforms:  t.platforms,
          links:      t.links,
          likeCount:  t.likeCount || 0
        }
      }));
      setEvents(mapped);
    } catch (err) {
      console.error("fetch tournaments failed", err);
    }
  }, [baseURL, apiEndpoint, user]);
  
  

// ---------- Run once auth is ready ----------
useEffect(() => {
  fetchAllTournaments();
}, [fetchAllTournaments]);



  // ——— Close modals on Escape ———
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        setShowForm(false);
        setShowDetailModal(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ——— Filter events via search ———
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEvents(events);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredEvents(
        events.filter(
          ev =>
            ev.title.toLowerCase().includes(q) ||
            ev.date.includes(q)
        )
      );
    }
  }, [searchQuery, events]);

  const handleInputChange = e => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setFormData(fd => ({ ...fd, image: files[0] }));
    } else if (name.startsWith('link-')) {
      const [_, field, idx] = name.split('-');
      setFormData(fd => {
        const links = [...fd.links];
        links[+idx][field] = value;
        return { ...fd, links };
      });
    } else {
      setFormData(fd => ({ ...fd, [name]: value }));
    }
  };

  const addLinkField = () =>
    setFormData(fd => ({
      ...fd,
      links: [...fd.links, { name: '', url: '' }],
    }));

  const formatTime = ts => {
    if (!ts.includes(':')) return 'N/A';
    const [h, m] = ts.split(':');
    const hr = +h % 12 || 12;
    return `${hr}:${m} ${+h >= 12 ? 'PM' : 'AM'}`;
  };

// ——— Create or update tournament ———
const handleFormSubmit = async (e) => {
  e.preventDefault();
  if (!formData.title || !formData.startTime || !formData.endTime) return;

  /* 1. Upload image (optional) */
  let imageUrl = null;
  if (formData.image) {
    const fd = new FormData();
    fd.append("file", formData.image);
    fd.append(
      "upload_preset",
      process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET
    );
    try {
      const resp = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: fd }
      );
      const json = await resp.json();
      imageUrl = json.secure_url;
    } catch (err) {
      console.error("Cloudinary upload failed", err);
    }
  }

  /* 2. Build payload */
  const payload = {
    title: formData.title,
    date: selectedDate,
    startTime: formData.startTime,
    endTime: formData.endTime,
    image: imageUrl,
    note: formData.note,
    platforms: formData.platforms,
    links: formData.links.filter((l) => l.url.trim()),
  };

  /* 3. Prepare headers (with Firebase token if logged in) */
  const headers = { "Content-Type": "application/json" };
  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  /* 4. Determine URL & method */
  const method = editingTournamentId ? "PUT" : "POST";
  const url = editingTournamentId
    ? `${baseURL}${apiEndpoint}/${editingTournamentId}`
    : `${baseURL}${apiEndpoint}`;

  /* 5. Send to backend */
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Save tournament failed:", res.status);
      return; // keep the form open on error
    }

    // ---- Success ----

    // a. Close the modal and reset edit state
    setShowForm(false);
    setEditingTournamentId(null);

    // b. Refresh your tournaments list in-place
    await fetchAllTournaments();
  } catch (err) {
    console.error("Save error", err);
  }
};



  // ——— Delete tournament ———
  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this tournament?'))
      return;
    const headers = {};
    if (user) {
      const token = await user.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    }
    try {
      await fetch(`${baseURL}${apiEndpoint}/${id}`, {
        method: 'DELETE',
        headers,
      });
      setEvents(ev => ev.filter(e => e.extendedProps._id !== id));
      setFilteredEvents(ev => ev.filter(e => e.extendedProps._id !== id));
      setShowDetailModal(false);
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  // ——— Edit from modal ———
  const handleEditFromModal = ev => {
    setFormData({
      title: ev.extendedProps.fullTitle,
      image: null,
      startTime: ev.extendedProps.startTime,
      endTime: ev.extendedProps.endTime,
      note: ev.extendedProps.note,
      platforms: ev.extendedProps.platforms || [],
      links:
        ev.extendedProps.links.length > 0
          ? ev.extendedProps.links
          : [{ name: '', url: '' }],
    });
    setSelectedDate(ev.date);
    setEditingTournamentId(ev.extendedProps._id);
    setShowForm(true);
    setShowDetailModal(false);
  };

  const renderEventContent = eventInfo => {
    const img = eventInfo.event.extendedProps.image;
    return (
      <div className="calendar-event group flex items-center space-x-1">
        {img && (
          <img
            src={img}
            alt="thumb"
            className="w-6 h-6 object-contain rounded-sm mr-1"
          />
        )}
        <span className="truncate">{eventInfo.event.title}</span>
      </div>
    );
  };

  const tournamentsOnDate = date =>
    events.filter(ev => ev.date === date);

  // ——— Render ———
  if (authLoading) return <div>Loading…</div>;
  if (!user) return <div>Please log in to view your tournaments.</div>;

  return (
    <div className="max-w-[1000px] mx-auto p-6">
      <input
        className="mb-4 p-2 w-full border rounded"
        placeholder="Search tournaments…"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={initialCalendarDate}
        events={filteredEvents}
        eventContent={renderEventContent}
        datesSet={handleDatesSet}
      />

      {/* ——— Form Modal ——— */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form
            className="bg-white p-6 rounded-xl shadow-xl w-96 space-y-4"
            onSubmit={handleFormSubmit}
          >
            <h2 className="text-xl font-bold">
              {editingTournamentId ? 'Edit Tournament' : 'Schedule Tournament'}
            </h2>
            <input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Name"
              className="w-full p-2 border rounded"
              required
            />
            <div className="flex space-x-2">
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                className="w-1/2 p-2 border rounded"
                required
              />
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                className="w-1/2 p-2 border rounded"
              />
            </div>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleInputChange}
            />
            <textarea
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              placeholder="Note…"
              className="w-full p-2 border rounded"
              rows={2}
            />
            <div className="flex space-x-2">
              {['pc', 'playstation', 'xbox'].map(p => (
                <button
                  key={p}
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-2 border rounded p-2 ${
                    formData.platforms.includes(p)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100'
                  }`}
                  onClick={() =>
                    setFormData(fd => {
                      const has = fd.platforms.includes(p);
                      return {
                        ...fd,
                        platforms: has
                          ? fd.platforms.filter(x => x !== p)
                          : [...fd.platforms, p],
                      };
                    })
                  }
                >
                  <img src={`/${p}.svg`} alt={p} className="w-5 h-5" />
                  <span className="capitalize text-sm">{p}</span>
                </button>
              ))}
            </div>
            {formData.links.map((ln, i) => (
              <div key={i} className="flex space-x-2">
                <input
                  name={`link-name-${i}`}
                  value={ln.name}
                  placeholder="Label"
                  onChange={handleInputChange}
                  className="w-1/2 p-2 border rounded"
                />
                <input
                  name={`link-url-${i}`}
                  value={ln.url}
                  placeholder="URL"
                  onChange={handleInputChange}
                  className="w-1/2 p-2 border rounded"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addLinkField}
              className="text-blue-500 hover:underline text-sm"
            >
              + Add link
            </button>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingTournamentId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

{/* ——— Detail Modal ——— */}
{showDetailModal && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">
        Tournaments on {modalDate}
      </h2>

      {tournamentsOnDate(modalDate).length === 0 ? (
        <p className="text-gray-500">No tournaments that day.</p>
      ) : (
        tournamentsOnDate(modalDate).map((ev, idx) => (
          <div
            key={idx}
            className="border p-4 mb-4 rounded-lg space-y-2 shadow relative"
          >
            <h3 className="text-lg font-semibold">
              {ev.extendedProps.fullTitle}
            </h3>

            <p>
              <b>Start:</b> {formatTime(ev.extendedProps.startTime)} {' | '}
              <b>End:</b>{' '}
              {ev.extendedProps.endTime
                ? formatTime(ev.extendedProps.endTime)
                : 'N/A'}
            </p>

            {ev.extendedProps.image && (
              <img
                src={ev.extendedProps.image}
                alt="Poster"
                className="w-full max-h-64 object-contain rounded-md mx-auto"
              />
            )}

            <div className="flex flex-wrap gap-2">
              {ev.extendedProps.links.map((lnk, i) => (
                <a
                  key={i}
                  href={lnk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
                >
                  {lnk.name || `Link ${i + 1}`}
                </a>
              ))}
            </div>

            {ev.extendedProps.platforms.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {ev.extendedProps.platforms.map((p) => (
                  <img
                    key={p}
                    src={`/${p}.svg`}
                    alt={p}
                    title={p}
                    className="w-6 h-6"
                  />
                ))}
              </div>
            )}

            {ev.extendedProps.note && (
              <p className="text-sm text-gray-700">
                <b>Details:</b> {ev.extendedProps.note}
              </p>
            )}

            {/* —— LIKE BUTTON —— */}
            <div className="mt-4">
              <LikeButton
                tournamentId={ev.extendedProps._id}
                initialCount={ev.extendedProps.likeCount || 0}
              />
            </div>

            {/* —— owner‑only Edit / Delete —— */}
            {user && user.uid === ev.extendedProps.createdBy && (
              <div className="absolute top-2 right-2 space-x-2">
                <button
                  onClick={() => handleEditFromModal(ev)}
                  className="text-sm bg-yellow-400 px-2 py-1 rounded hover:bg-yellow-500"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(ev.extendedProps._id)}
                  className="text-sm bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowDetailModal(false)}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}


    </div>
  );
}
