import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import './calendar.css';

export default function TournamentCalendar() {
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
  const [editingEventIndex, setEditingEventIndex] = useState(null);
  const calendarRef = useRef(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tournaments`);
        const data = await response.json();
        const formatted = data.map(t => ({
          title: t.title,
          date: t.date,
          extendedProps: {
            fullTitle: t.title,
            startTime: t.startTime,
            endTime: t.endTime,
            image: t.image,
            note: t.note,
            platforms: t.platforms,
            links: t.links,
          },
        }));
        setEvents(formatted);
      } catch (err) {
        console.error('Failed to fetch tournaments:', err);
      }
    };
  
    fetchTournaments();
  }, []);
  

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowForm(false);
        setShowDetailModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const dayEls = document.querySelectorAll('.fc-daygrid-day');
    dayEls.forEach((el) => {
      const date = el.getAttribute('data-date');
      el.style.position = 'relative';

      if (!el.querySelector('.add-btn')) {
        const btn = document.createElement('button');
        btn.textContent = '+';
        btn.className = 'add-btn hidden absolute top-1 left-1 bg-blue-600 text-white rounded-full w-6 h-6 text-sm';
        btn.onclick = (e) => {
          e.stopPropagation();
          handleDateClick({ dateStr: date });
        };
        el.appendChild(btn);
      }

      el.addEventListener('mouseenter', () => {
        const plusBtn = el.querySelector('.add-btn');
        if (plusBtn) plusBtn.classList.remove('hidden');
      });
      el.addEventListener('mouseleave', () => {
        const plusBtn = el.querySelector('.add-btn');
        if (plusBtn) plusBtn.classList.add('hidden');
      });

      el.addEventListener('click', () => {
        const dateStr = el.getAttribute('data-date');
        if (dateStr) {
          setModalDate(dateStr);
          setShowDetailModal(true);
        }
      });
    });
  }, [filteredEvents]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEvents(events);
    } else {
      const lower = searchQuery.toLowerCase();
      setFilteredEvents(
        events.filter(
          (event) =>
            event.title.toLowerCase().includes(lower) ||
            event.date.includes(lower)
        )
      );
    }
  }, [searchQuery, events]);

  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr);
    setShowForm(true);
    setEditingEventIndex(null);
    setFormData({ title: '', image: null, startTime: '', endTime: '', links: [{ name: '', url: '' }] });
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
  
    if (name === 'image') {
      setFormData({ ...formData, image: files[0] });
    } else if (name.startsWith('link-name-') || name.startsWith('link-url-')) {
      const parts = name.split('-'); // e.g. ['link', 'name', '0']
      const index = parseInt(parts[2]);
      const field = parts[1]; // 'name' or 'url'
  
      const updatedLinks = [...formData.links];
      updatedLinks[index][field] = value;
      setFormData({ ...formData, links: updatedLinks });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  

  const addLinkField = () => {
    setFormData({ ...formData, links: [...formData.links, { name: '', url: '' }] });
  };

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minute} ${suffix}`;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startTime || !formData.endTime) return;
  
    // Upload image to Cloudinary if there's an image
    let imageUrl = null;
  
    if (formData.image) {
      const uploadData = new FormData();
      uploadData.append('file', formData.image);
      uploadData.append('upload_preset', 'tourney'); // your unassigned preset
  
      try {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/dfeedwjpf/image/upload`,
          {
            method: 'POST',
            body: uploadData,
          }
        );
        const data = await response.json();
        imageUrl = data.secure_url;
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }
  
    // Create the new event object for your frontend calendar
    const newEvent = {
      title: formData.title,
      date: selectedDate,
      extendedProps: {
        fullTitle: formData.title,
        startTime: formData.startTime,
        endTime: formData.endTime,
        image: imageUrl,
        note: formData.note,
        platforms: formData.platforms,
        links: formData.links.filter((l) => l.url.trim() !== ""),
      },
    };
  
    // Save to backend
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          date: selectedDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          image: imageUrl,
          note: formData.note,
          platforms: formData.platforms,
          links: formData.links.filter((l) => l.url.trim() !== ''),
        }),
      });
    } catch (err) {
      console.error('Error saving tournament to backend:', err);
    }
  
    // Add event to calendar
    setEvents([...events, newEvent]);
    setShowForm(false);
  };  
  
    

    let updatedEvents = [...events];
    if (editingEventIndex !== null) {
      updatedEvents[editingEventIndex] = newEvent;
    } else {
      updatedEvents.push(newEvent);
    }

    setEvents(updatedEvents);
    setFormData({ title: '', image: null, startTime: '', endTime: '', links: [{ name: '', url: '' }] });
    setShowForm(false);
    setEditingEventIndex(null);
  };

  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this tournament?')) {
      const updated = [...events];
      updated.splice(index, 1);
      setEvents(updated);
    }
  };

  const handleEditFromModal = (event, index) => {
    setFormData({
      title: event.extendedProps.fullTitle,
      image: null,
      startTime: event.extendedProps.startTime,
      endTime: event.extendedProps.endTime,
      links: event.extendedProps.links.length > 0 ? event.extendedProps.links : [{ name: '', url: '' }],
    });
    setSelectedDate(event.date);
    setEditingEventIndex(index);
    setShowForm(true);
    setShowDetailModal(false);
  };

  const renderEventContent = (eventInfo) => {
    const { image } = eventInfo.event.extendedProps;
    return (
      <div className="calendar-event group flex items-center space-x-1">
        {image && (
          <img src={image} alt="thumb" className="w-6 h-6 object-contain rounded-sm mr-1" />
        )}
        <span className="truncate text-left">{eventInfo.event.title}</span>
      </div>
    );
  };

  const tournamentsOnDate = (dateStr) => events.filter((event) => event.date === dateStr);

  return (
    <div className="max-w-[1000px] mx-auto p-6">
      <input
        type="text"
        placeholder="Search tournaments by name or date..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4 p-2 w-full border rounded"
      />

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={filteredEvents}
        eventContent={renderEventContent}
      />

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-all animate-fade-in">
          <form
  className="bg-white p-6 rounded-xl shadow-xl w-96 space-y-4"
  onSubmit={handleFormSubmit}
>
  <h2 className="text-xl font-bold">
    {editingEventIndex !== null ? 'Edit Tournament' : 'Schedule Tournament'}
  </h2>
  <input
    type="text"
    name="title"
    value={formData.title}
    onChange={handleInputChange}
    placeholder="Tournament Name"
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

  {/* Note input */}
  <textarea
    name="note"
    value={formData.note || ''}
    onChange={handleInputChange}
    placeholder="Short note about the tournament..."
    className="w-full p-2 border rounded"
    rows={2}
  />

  {/* Platform toggles */}
  <div className="flex items-center justify-between">
    {['pc', 'playstation', 'xbox'].map((platform) => (
      <button
        key={platform}
        type="button"
        className={`flex-1 flex items-center justify-center gap-2 border rounded p-2 mx-1 
          ${formData.platforms?.includes(platform) ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        onClick={() =>
          setFormData((prev) => {
            const platforms = prev.platforms || [];
            return {
              ...prev,
              platforms: platforms.includes(platform)
                ? platforms.filter((p) => p !== platform)
                : [...platforms, platform],
            };
          })
        }
      >
        <img
          src={`/${platform}.svg`}
          alt={platform}
          className="w-5 h-5"
        />
        <span className="capitalize text-sm">{platform}</span>
      </button>
    ))}
  </div>

  {/* Links */}
  {formData.links.map((link, index) => (
    <div key={index} className="flex space-x-2">
      <input
        type="text"
        name={`link-name-${index}`}
        placeholder="Link Label"
        value={link.name}
        onChange={(e) => handleInputChange(e, index, 'name')}
        className="w-1/2 p-2 border rounded"
      />
      <input
        type="url"
        name={`link-url-${index}`}
        placeholder="URL"
        value={link.url}
        onChange={(e) => handleInputChange(e, index, 'url')}
        className="w-1/2 p-2 border rounded"
      />
    </div>
  ))}
  <button
    type="button"
    onClick={addLinkField}
    className="text-sm text-blue-500 hover:underline"
  >
    + Add another link
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
      {editingEventIndex !== null ? 'Update' : 'Save'}
    </button>
  </div>
</form>

        </div>
      )}

      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-all animate-fade-in">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Tournaments on {modalDate}</h2>
            {tournamentsOnDate(modalDate).length === 0 ? (
              <p className="text-gray-500">No tournament scheduled for today.</p>
            ) : (
              tournamentsOnDate(modalDate).map((event, index) => (
                <div key={index} className="border p-4 mb-4 rounded-lg space-y-2 shadow relative">
                  <h3 className="text-lg font-semibold">{event.extendedProps.fullTitle}</h3>
                  <p>
                    <b>Start:</b> {formatTime(event.extendedProps.startTime)} &nbsp; | &nbsp;
                    <b>End:</b> {event.extendedProps.endTime ? formatTime(event.extendedProps.endTime) : 'N/A'}
                  </p>
                  {event.extendedProps.image && (
                    <img
                      src={event.extendedProps.image}
                      alt="Poster"
                      className="w-full max-h-64 object-contain rounded-md mx-auto"
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
  {event.extendedProps.links?.map((link, i) => (
    <a
      key={i}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
    >
      {link.name || `Link ${i + 1}`}
    </a>
  ))}
</div>

                  {/* Platform icons */}
                  {event.extendedProps.platforms?.length > 0 && (
  <div className="flex items-center gap-2 mt-2">
    {event.extendedProps.platforms.map((platform) => (
      <img
        key={platform}
        src={`/${platform}.svg`}
        alt={platform}
        title={platform}
        className="w-6 h-6"
      />
    ))}
  </div>
)}

{event.extendedProps.note && (
  <div>
    <p className="text-sm text-gray-700">
      <b>Details:</b> {event.extendedProps.note}
    </p>
  </div>
)}




                  <div className="absolute top-2 right-2 space-x-2">
                    <button
                      onClick={() => handleEditFromModal(event, events.findIndex((e) => e === event))}
                      className="text-sm bg-yellow-400 px-2 py-1 rounded hover:bg-yellow-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(events.findIndex((e) => e === event))}
                      className="text-sm bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
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
