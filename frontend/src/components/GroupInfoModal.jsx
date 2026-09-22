import React, { useState, useEffect } from 'react';
import { X, Shield, UserPlus, LogOut, Trash2, Settings, Info, Activity, Copy, RefreshCw, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { getUsers } from '../services/userService';
import { getAvatarUrl } from '../utils/getAvatarUrl';
import api from '../services/api';

const GroupInfoModal = ({ onClose }) => {
  const { user } = useAuth();
  const { selectedChat, setSelectedChat, clearChat, loadConversations } = useChat();
  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState('info');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [reportedMessages, setReportedMessages] = useState([]);
  const [inviteLink, setInviteLink] = useState('');

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState(selectedChat?.groupName || '');
  const [editDesc, setEditDesc] = useState(selectedChat?.groupDescription || '');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  const isAdmin = 
    (typeof selectedChat?.groupAdmin === 'object' ? selectedChat?.groupAdmin?._id : selectedChat?.groupAdmin) === user?._id || 
    selectedChat?.groupAdmins?.some(a => (typeof a === 'object' ? a._id : a) === user?._id);

  // Load activity/reports if tabs changed
  useEffect(() => {
    if (activeTab === 'activity' && isAdmin) {
      api.get(`/groups/${selectedChat._id}/activity`).then(res => setActivityLogs(res.data)).catch(err => console.error(err));
    }
    if (activeTab === 'reports' && isAdmin) {
      api.get(`/groups/${selectedChat._id}/reports`).then(res => setReportedMessages(res.data)).catch(err => console.error(err));
    }
    if (activeTab === 'settings' && isAdmin && selectedChat.inviteCode) {
      setInviteLink(`${window.location.origin}/join/${selectedChat.inviteCode}`);
    }
  }, [activeTab, selectedChat._id, isAdmin, selectedChat.inviteCode]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const delaySearch = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await getUsers(search);
        const existingMemberIds = selectedChat.participants.map((p) => p._id);
        const filtered = users.filter((u) => !existingMemberIds.includes(u._id));
        setSearchResults(filtered);
      } catch (err) {
        console.error('User search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(delaySearch);
  }, [search, selectedChat.participants]);

  const updateChatState = (data) => {
    setSelectedChat(data);
    loadConversations();
  };

  const handleSaveGroupInfo = async () => {
    try {
      const formData = new FormData();
      formData.append('groupName', editName);
      formData.append('groupDescription', editDesc);
      if (editImageFile) {
        formData.append('groupImage', editImageFile);
      }
      const res = await api.put(`/groups/${selectedChat._id}/settings`, formData);
      updateChatState(res.data);
      setIsEditingInfo(false);
      toast.success('Group info updated');
    } catch (err) {
      console.error("Save Group Info Error:", err);
      toast.error(err.response?.data?.message || 'Failed to update group info');
    }
  };

  const handleAdd = async (userToAdd) => {
    try {
      const res = await api.post(`/groups/${selectedChat._id}/members`, { userIds: [userToAdd._id] });
      updateChatState(res.data);
      setSearch('');
      toast.success('Member added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemove = async (userToRemove, block = false) => {
    if (await confirm(`Are you sure you want to ${block ? 'block' : 'remove'} ${userToRemove.name}?`)) {
      try {
        const res = await api.delete(`/groups/${selectedChat._id}/members/${userToRemove._id}?block=${block}`);
        updateChatState(res.data);
        toast.success(`Member ${block ? 'blocked' : 'removed'}`);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to remove member');
      }
    }
  };

  const handleLeave = async () => {
    if (await confirm('Are you sure you want to leave this group?')) {
      try {
        await api.delete(`/groups/${selectedChat._id}/members/${user._id}`);
        setSelectedChat(null);
        loadConversations();
        onClose();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to leave group');
      }
    }
  };

  const handlePromote = async (memberId) => {
    try {
      const res = await api.put(`/groups/${selectedChat._id}/admins/${memberId}`);
      updateChatState(res.data);
      toast.success('Promoted to admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to promote admin');
    }
  };

  const handleDemote = async (memberId) => {
    try {
      const res = await api.delete(`/groups/${selectedChat._id}/admins/${memberId}`);
      updateChatState(res.data);
      toast.success('Demoted from admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to demote admin');
    }
  };

  const generateInviteLink = async () => {
    try {
      const res = await api.post(`/groups/${selectedChat._id}/invite`);
      setInviteLink(`${window.location.origin}/join/${res.data.inviteCode}`);
      toast.success('New invite link generated');
      loadConversations(); // to get updated chat object
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate link');
    }
  };

  const updateSetting = async (field, value, isPermission = false) => {
    try {
      const body = isPermission ? { permissions: { [field]: value } } : { [field]: value };
      const res = await api.put(`/groups/${selectedChat._id}/settings`, body);
      updateChatState(res.data);
      toast.success('Settings updated');
    } catch (err) {
      toast.error('Failed to update setting');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', width: '500px', maxWidth: '95vw', padding: '24px 0 0 0', overflow: 'hidden' }}>
        <div className="modal-header" style={{ padding: '0 24px', marginBottom: '20px' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Group Dashboard</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', padding: '0 24px', marginBottom: '16px', overflowX: 'auto', flexShrink: 0 }}>
          {['info', 'members', 'settings', 'activity', 'reports'].map((tab) => {
            if ((tab === 'settings' || tab === 'activity' || tab === 'reports') && !isAdmin) return null;
            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: 'none', background: activeTab === tab ? 'var(--accent-primary)' : 'var(--bg-glass)', color: activeTab === tab ? '#fff' : 'var(--text-main)', cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap', flexShrink: 0
                }}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px' }}>
          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div style={{ textAlign: 'center' }}>
              {isEditingInfo ? (
                <>
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
                    <img src={editImagePreview || getAvatarUrl(selectedChat.groupImage, selectedChat.groupName)} alt="Group" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
                    <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--accent-primary)', padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
                      <Settings size={16} color="#fff" />
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                        if (e.target.files[0]) {
                          setEditImageFile(e.target.files[0]);
                          setEditImagePreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }} />
                    </label>
                  </div>
                  <input type="text" className="input-field" style={{ marginBottom: '8px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }} value={editName} onChange={e => setEditName(e.target.value)} />
                  <textarea className="input-field" style={{ marginBottom: '16px', textAlign: 'center', resize: 'none', height: '60px' }} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Group description..." />
                  
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveGroupInfo}>Save Changes</button>
                    <button className="btn-secondary" style={{ flex: 1, padding: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '12px', color: 'var(--text-main)', cursor: 'pointer' }} onClick={() => {
                      setIsEditingInfo(false);
                      setEditName(selectedChat.groupName);
                      setEditDesc(selectedChat.groupDescription || '');
                      setEditImageFile(null);
                      setEditImagePreview(null);
                    }}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <img src={getAvatarUrl(selectedChat.groupImage, selectedChat.groupName)} alt="Group" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {selectedChat.groupName}
                    {isAdmin && (
                      <button className="icon-btn" onClick={() => {
                        setEditName(selectedChat.groupName);
                        setEditDesc(selectedChat.groupDescription || '');
                        setIsEditingInfo(true);
                      }} style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)', padding: '4px' }}>
                        <Settings size={16} />
                      </button>
                    )}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{selectedChat.groupDescription || 'No description provided.'}</p>
                </>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedChat.participants.length}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Members</div>
                </div>
                <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{new Date(selectedChat.createdAt).toLocaleDateString()}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Created</div>
                </div>
              </div>

              <button onClick={clearChat} style={{ width: '100%', padding: '14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', marginBottom: '12px' }}>
                <Trash2 size={18} /> Clear Chat
              </button>
              <button onClick={handleLeave} style={{ width: '100%', padding: '14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer' }}>
                <LogOut size={18} /> Leave Group
              </button>
            </div>
          )}

          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div>
              {isAdmin && (
                <div style={{ marginBottom: '20px' }}>
                  <div className="search-box">
                    <input type="text" className="input-field" placeholder="Search users to add..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  {search.trim() && (
                    <div style={{ marginTop: '8px', maxHeight: '120px', overflowY: 'auto', background: 'var(--bg-glass)', borderRadius: '8px', padding: '8px' }}>
                      {searching ? <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Searching...</div> : searchResults.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users found</div> : searchResults.map((u) => (
                        <div key={u._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '8px', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={getAvatarUrl(u.profileImage, u.name)} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                            <span>{u.name}</span>
                          </div>
                          <button className="icon-btn" style={{ background: 'var(--accent-primary)', color: '#fff' }} onClick={() => handleAdd(u)}><UserPlus size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedChat.participants.map((p) => {
                  const memberObj = typeof p === 'object' && p !== null ? p : { _id: p, name: 'User', email: '' };
                  const memberId = memberObj._id;
                  const isParticipantAdmin = 
                    selectedChat?.groupAdmin === memberId || 
                    selectedChat?.groupAdmin?._id === memberId ||
                    selectedChat?.groupAdmins?.includes(memberId) || 
                    selectedChat?.groupAdmins?.some(a => (a._id || a) === memberId);

                  return (
                    <div key={memberId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-glass)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={getAvatarUrl(memberObj.profileImage, memberObj.name)} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {memberObj.name} {memberId === user._id && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>(You)</span>}
                            {isParticipantAdmin && <Shield size={14} color="var(--accent-primary)" title="Admin" />}
                          </div>
                          {memberObj.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{memberObj.email}</div>}
                        </div>
                      </div>
                      
                      {isAdmin && memberId !== user._id && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!isParticipantAdmin ? (
                            <button className="icon-btn" onClick={() => handlePromote(memberId)} title="Promote to Admin" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)' }}><Shield size={16} /></button>
                          ) : (
                            <button className="icon-btn" onClick={() => handleDemote(memberId)} title="Demote Admin" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Shield size={16} /></button>
                          )}
                          <button className="icon-btn" onClick={() => handleRemove(memberObj, false)} title="Remove" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><LogOut size={16} /></button>
                          <button className="icon-btn" onClick={() => handleRemove(memberObj, true)} title="Block" style={{ background: '#ef4444', color: '#fff' }}><Trash2 size={16} /></button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Info size={18} /> Announcement Mode</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Only admins can send messages.</span>
                  <label className="switch">
                    <input type="checkbox" checked={selectedChat.announcementMode || false} onChange={(e) => updateSetting('announcementMode', e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={18} /> Member Permissions</h4>
                {['sendMessages', 'sendMedia', 'sendFiles', 'sendLinks'].map(perm => (
                  <div key={perm} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{perm.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <label className="switch">
                      <input type="checkbox" checked={selectedChat.permissions?.[perm] !== false} onChange={(e) => updateSetting(perm, e.target.checked, true)} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus size={18} /> Invite Link</h4>
                {inviteLink ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" value={inviteLink} readOnly className="input-field" style={{ flex: 1 }} />
                    <button className="icon-btn" onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Link copied'); }}><Copy size={18} /></button>
                    <button className="icon-btn" onClick={generateInviteLink}><RefreshCw size={18} /></button>
                  </div>
                ) : (
                  <button onClick={generateInviteLink} className="btn-primary" style={{ width: '100%' }}>Generate Invite Link</button>
                )}
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activityLogs.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No activity logs found.</div> : activityLogs.map(log => (
                <div key={log._id} style={{ padding: '12px', background: 'var(--bg-glass)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{new Date(log.createdAt).toLocaleString()}</div>
                  <div><strong>{log.adminId?.name || 'System'}</strong> {log.details} {log.targetUserId ? <strong>{log.targetUserId.name}</strong> : ''}</div>
                </div>
              ))}
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reportedMessages.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No reported messages.</div> : reportedMessages.map(msg => (
                <div key={msg._id} style={{ padding: '12px', background: 'var(--bg-glass)', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Flag size={16} color="#ef4444" /> <strong>{msg.reports.length} Reports</strong>
                  </div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '8px', fontStyle: 'italic' }}>"{msg.text}"</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sender: {msg.sender?.name}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;
