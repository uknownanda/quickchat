import React, { useContext, useEffect, useState } from 'react';
import assets from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ChatContext } from '../../context/ChatContext';
import toast from 'react-hot-toast';
import ProfileImagePreview from './ProfileImagePreview';

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, unseenMessages, setUnseenMessages } = useContext(ChatContext);
  const { logout, onlineUsers, axios } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [showDiscover, setShowDiscover] = useState(false);
  const navigate = useNavigate();

  const loadRequests = async () => { try { const { data } = await axios.get('/api/contacts/requests'); if (data.success) setRequests(data); } catch (e) { console.error(e); } };
  useEffect(() => { getUsers(); loadRequests(); }, [onlineUsers]);
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      try { const { data } = await axios.get(`/api/contacts/search?q=${encodeURIComponent(query)}`); setResults(data.users || []); }
      catch (e) { toast.error(e.response?.data?.message || 'Search failed'); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const invite = async (id) => { try { await axios.post(`/api/contacts/requests/${id}`); toast.success('Invitation sent'); setResults(old => old.map(u => u._id === id ? { ...u, relationship: 'sent' } : u)); loadRequests(); } catch (e) { toast.error(e.response?.data?.message || 'Could not send invitation'); } };
  const respond = async (id, action) => { try { await axios.patch(`/api/contacts/requests/${id}`, { action }); toast.success(action === 'accept' ? 'Contact added' : 'Invitation declined'); await Promise.all([getUsers(), loadRequests()]); } catch (e) { toast.error(e.response?.data?.message || 'Could not update invitation'); } };

  return (
    <aside className={`qc-sidebar h-full p-4 md:p-5 rounded-r-2xl overflow-y-auto text-white ${selectedUser ? 'max-md:hidden' : ''}`}>
      <div className="flex justify-between items-center pb-4">
        <div><div className="text-2xl font-bold tracking-tight">Quick<span className="qc-gradient-text">Chat</span></div><p className="text-xs text-white/45">Your private space</p></div>
        <div className="relative group"><button className="qc-icon-btn" aria-label="Menu">⋯</button><div className="absolute top-full right-0 z-30 w-36 p-3 rounded-xl bg-[#211b35] border border-white/10 hidden group-hover:block shadow-xl"><button onClick={() => navigate('/profile')} className="block text-sm py-2">Edit profile</button><button onClick={logout} className="block text-sm py-2 text-rose-300">Logout</button></div></div>
      </div>
      <button
        onClick={() => {
          setShowDiscover((isOpen) => {
            if (isOpen) setQuery("");
            return !isOpen;
          });
        }}
        className="qc-primary-btn w-full mb-3"
        aria-expanded={showDiscover}
        aria-controls="quickchat-discover-panel"
      >
        ＋ Find people
      </button>
      {showDiscover && <section id="quickchat-discover-panel" className="qc-panel p-3 mb-4">
        <p className="font-semibold text-sm mb-2">Discover people</p>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by username or name"
          aria-label="Search people by username or name"
          className="qc-input w-full"
        />
        <div className="mt-2 space-y-2 max-h-44 overflow-y-auto">{results.map(user => <div key={user._id} className="flex items-center gap-2 text-sm"><ProfileImagePreview src={user.profilePic || assets.avatar_icon} alt={`${user.fullName}'s profile picture`} className="w-8 h-8 rounded-full object-cover"/><div className="min-w-0 flex-1"><p className="truncate">{user.fullName}</p><p className="text-[10px] text-white/40 truncate">@{user.username}</p></div>{user.relationship === 'none' || user.relationship === 'rejected' ? <button onClick={() => invite(user._id)} className="qc-small-btn">Invite</button> : <span className="text-[10px] text-violet-200">{user.relationship === 'contact' ? 'Connected' : user.relationship === 'sent' ? 'Pending' : 'Requested you'}</span>}</div>)}{query.length >= 2 && !results.length && <p className="text-xs text-white/40">No matching people</p>}</div>
      </section>}
      {!!requests.received?.length && <section className="qc-panel p-3 mb-4"><div className="flex justify-between mb-2"><p className="font-semibold text-sm">Invitations</p><span className="qc-count">{requests.received.length}</span></div>{requests.received.map(r => <div key={r._id} className="flex items-center gap-2 py-2"><ProfileImagePreview src={r.sender?.profilePic || assets.avatar_icon} alt={`${r.sender?.fullName || "Contact"}'s profile picture`} className="w-8 h-8 rounded-full object-cover"/><p className="flex-1 text-xs truncate">{r.sender?.fullName}</p><button onClick={() => respond(r._id, 'accept')} className="qc-small-btn">Accept</button><button onClick={() => respond(r._id, 'reject')} className="text-xs text-white/45">×</button></div>)}</section>}
      <div className="flex items-center justify-between mb-3"><p className="text-xs uppercase tracking-[.18em] text-white/45">Your contacts</p><span className="text-xs text-white/35">{users.length}</span></div>
      <div className="space-y-1">{users.map(user => <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setSelectedUser(user);
            setUnseenMessages(prev => ({ ...prev, [user._id]: 0 }));
          }
        }}
        onClick={() => {
          setSelectedUser(user);
          setUnseenMessages(prev => ({ ...prev, [user._id]: 0 }));
        }}
        key={user._id}
        className={`qc-contact w-full text-left flex items-center gap-3 p-2.5 rounded-xl cursor-pointer ${selectedUser?._id === user._id ? 'active' : ''}`}
      ><span className="relative"><ProfileImagePreview src={user.profilePic || assets.avatar_icon} alt={`${user.fullName}'s profile picture`} className="w-10 h-10 rounded-full object-cover"/><i className={`qc-online-dot ${onlineUsers.includes(user._id) ? 'online' : ''}`}/></span><span className="min-w-0 flex-1"><span className="block text-sm truncate">{user.fullName}</span><span className={`block text-[11px] truncate ${onlineUsers.includes(user._id) ? 'text-emerald-300' : 'text-white/40'}`}>{onlineUsers.includes(user._id) ? 'Online' : 'Offline'}</span></span>{unseenMessages[user._id] > 0 && <span className="qc-count">{unseenMessages[user._id]}</span>}</div>)}{!users.length && <p className="text-center text-xs text-white/40 py-8">No contacts yet. Find people and send an invitation.</p>}</div>
    </aside>
  );
};
export default Sidebar;
