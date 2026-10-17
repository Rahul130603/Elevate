import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  Clock,
  Briefcase,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Key,
  Lock,
  Copy,
  Check,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  X
} from 'lucide-react';

export function AdminClients() {
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'history'
  const [clients, setClients] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for creating new client credentials
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    phone: '+91 ',
    password: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [showPasswordMap, setShowPasswordMap] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientsRes, accountsRes] = await Promise.all([
        apiRequest('/admin/clients').catch(() => ({ clients: [] })),
        apiRequest('/admin/client-accounts').catch(() => ({ clients: [] })),
      ]);
      setClients(clientsRes.clients || []);
      setAccounts(accountsRes.clients || []);
    } catch (err) {
      console.error('Failed to load client data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.username.trim() || !createForm.password.trim()) {
      setCreateError('Please fill in Client Name, User ID, and Password.');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      await apiRequest('/admin/client-accounts', {
        method: 'POST',
        body: {
          name: createForm.name.trim(),
          username: createForm.username.trim(),
          phone: createForm.phone.trim(),
          password: createForm.password.trim(),
        },
      });

      setCreateForm({ name: '', username: '', phone: '+91 ', password: '' });
      setIsCreateOpen(false);
      await fetchData();
    } catch (err) {
      setCreateError(err.message || 'Failed to create client credentials.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAccount = async (id, name) => {
    if (!confirm(`Are you sure you want to remove client credentials for "${name}"? They will lose booking access.`)) {
      return;
    }

    try {
      await apiRequest(`/admin/client-accounts/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete client account.');
    }
  };

  const copyCredentials = (acc) => {
    const text = `Elevate Client Access:\nUser ID: ${acc.id}\nEmail: ${acc.email || acc.username}\nBooking Link: ${window.location.origin}/?mode=book`;
    navigator.clipboard.writeText(text);
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const toggleShowPassword = (id) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAccounts = accounts.filter(a => {
    const term = searchTerm.toLowerCase();
    return (
      (a.name && a.name.toLowerCase().includes(term)) ||
      (a.id && a.id.toLowerCase().includes(term)) ||
      (a.email && a.email.toLowerCase().includes(term)) ||
      (a.phone && a.phone.toLowerCase().includes(term))
    );
  });

  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-8 h-8 text-orange-500" />
            <span>Manage Clients & Appointments</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Clients can register and set passwords directly on the booking link. Review accounts and meeting history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add Client (Optional)</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Open Link Status Banner */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-white p-4 rounded-2xl border border-orange-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">
              Open Client Link Active — Direct Self-Service Registration
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Clients access the public link directly, provide Name, Email, Phone, and create their own password to book and track appointments. No manual credential setup required.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const link = `${window.location.origin}/?mode=book`;
            navigator.clipboard.writeText(link);
            alert(`Client booking link copied:\n${link}`);
          }}
          className="px-3.5 py-1.5 bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-orange-500" />
          <span>Copy Client Link</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-xs">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-orange-500" />
            <span>Registered Client Accounts</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-600">
              {accounts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-orange-500" />
            <span>Booking History & Records</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
              {clients.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'accounts' ? "Search client accounts, User ID..." : "Search client bookings..."}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          />
        </div>
      </div>

      {/* TAB 1: CLIENT ACCOUNTS (User IDs & Passwords) */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
              <p className="text-sm">Loading client accounts...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Key className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-700">No client credentials found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Create User ID and Passwords for clients so they can log in and book appointments.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Client Credentials</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-6">Client Name</th>
                    <th className="py-3.5 px-6">User ID</th>
                    <th className="py-3.5 px-6">Email Address</th>
                    <th className="py-3.5 px-6">Contact Details</th>
                    <th className="py-3.5 px-6">Access Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.map((acc) => {
                    const isCopied = copiedId === acc.id;

                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                              <GentizeText>{acc.name?.charAt(0) || 'C'}</GentizeText>
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm"><GentizeText>{acc.name}</GentizeText></p>
                              <span className="text-[10px] text-slate-400">Created: {acc.created_at?.split('T')[0]}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-lg text-slate-900 font-mono font-bold text-xs">
                            <UserCheck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                            <span>{acc.id}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                            <Mail className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span><GentizeText>{acc.email || acc.username || '—'}</GentizeText></span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          {acc.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{acc.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium">N/A</span>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            Booking Allowed
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => copyCredentials(acc)}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 ${
                                isCopied
                                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                              title="Copy login details to send to client"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-orange-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                              <span>{isCopied ? 'Copied!' : 'Copy Login'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(acc.id, acc.name)}
                              className="p-1.5 rounded-lg border border-transparent hover:border-rose-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete Client Access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BOOKING HISTORY & CLIENT RECORDS */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
              <p className="text-sm">Loading client booking history...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-700">No client booking records found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                When authenticated clients book appointments, their meeting records will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-6">Client Name</th>
                    <th className="py-3.5 px-6">Contact Details</th>
                    <th className="py-3.5 px-6">Source</th>
                    <th className="py-3.5 px-6">Total Bookings</th>
                    <th className="py-3.5 px-6">Last Meeting</th>
                    <th className="py-3.5 px-6">Latest Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                            <GentizeText>{client.name?.charAt(0) || 'C'}</GentizeText>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm"><GentizeText>{client.name}</GentizeText></p>
                            <span className="text-[10px] text-slate-400">Client Record #{idx + 1}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          client.booking_source === 'CLIENT'
                            ? 'bg-orange-50 text-orange-600 border border-orange-200'
                            : 'bg-orange-50 text-orange-600 border border-orange-200'
                        }`}>
                          {client.booking_source || 'CLIENT'}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-800 text-sm">{client.total_bookings}</span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{client.last_booking_date || 'N/A'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-slate-700 font-medium line-clamp-1 max-w-xs">
                          <GentizeText>{client.last_purpose || 'General Meeting'}</GentizeText>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE CLIENT CREDENTIALS MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-orange-200/80 p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create Client Login</h3>
                  <p className="text-xs text-slate-500">Provide credentials for client to access booking.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Client Full Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Client User ID / Login ID *
                </label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="e.g. ramesh or ramesh@calgen.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  The client will type this User ID on the booking site.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Client Password *
                </label>
                <input
                  type="text"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="e.g. client123 or secretPass"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-wider transition shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Create Credentials</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
