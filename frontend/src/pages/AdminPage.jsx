import { useState, useRef, useEffect } from "react";
import * as api from "../api";
import { Btn, SmallBtn } from "../components/ui/Btn";
import PermToggle from "../components/ui/PermToggle";
import GroupAccessEditor from "../components/GroupAccessEditor";
import AddUserModal from "../components/modals/AddUserModal";
import EditUserModal from "../components/modals/EditUserModal";
import { ADMIN_MENU, PERMISSION_LABELS, APP_PERMISSIONS } from "../constants";
import {
  PlusIcon,
  XIcon,
  EditIcon,
  TrashIcon,
  ShieldIcon,
  MapPinIcon,
  LayersIcon,
  SearchIcon,
  ClipboardIcon,
  FolderClosedIcon,
  UploadCloudIcon,
  LinkIcon,
  LockIcon,
} from "../components/Icons";

// Authentication Settings Section
function AuthenticationSection({ t, darkMode }) {
  const [samlSettings, setSamlSettings] = useState({
    enabled: false,
    idp_entity_id: '',
    idp_sso_url: '',
    idp_slo_url: '',
    idp_x509_cert: '',
    idp_metadata_url: '',
    sp_entity_id: '',
    sp_acs_url: '',
    sp_slo_url: '',
    attribute_email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    attribute_name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    attribute_username: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
    auto_provision: true,
    default_group_id: '',
    allow_local_login: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [securityGroups, setSecurityGroups] = useState([]);

  useEffect(() => {
    loadSettings();
    loadSecurityGroups();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await api.getSamlSettings();
      setSamlSettings({
        enabled: settings.enabled || false,
        idp_entity_id: settings.idp_entity_id || '',
        idp_sso_url: settings.idp_sso_url || '',
        idp_slo_url: settings.idp_slo_url || '',
        idp_x509_cert: settings.idp_x509_cert || '',
        idp_metadata_url: settings.idp_metadata_url || '',
        sp_entity_id: settings.sp_entity_id || '',
        sp_acs_url: settings.sp_acs_url || '',
        sp_slo_url: settings.sp_slo_url || '',
        attribute_email: settings.attribute_email || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        attribute_name: settings.attribute_name || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
        attribute_username: settings.attribute_username || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
        auto_provision: settings.auto_provision !== false,
        default_group_id: settings.default_group_id || '',
        allow_local_login: settings.allow_local_login !== false,
      });
    } catch (err) {
      console.error('Failed to load SAML settings:', err);
    } finally {
      setLoading(false);
    }
  };

const loadSecurityGroups = async () => {
    try {
      const data = await api.getGroups();
      setSecurityGroups(data.groups || data);
    } catch (err) {
      console.error('Failed to load security groups:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.saveSamlSettings(samlSettings);
      setMessage({ type: 'success', text: 'Authentication settings saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save: ' + (err.message || 'Unknown error') });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    background: darkMode ? '#1a1a1a' : '#fff',
    color: t.text,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: 100,
    resize: 'vertical',
    fontFamily: 'monospace',
    fontSize: 12,
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: t.text,
    display: 'block',
    marginBottom: 8,
  };

  const hintStyle = {
    fontSize: 11,
    color: t.textDim,
    margin: '4px 0 0',
  };

  return (
    <div>
      {/* SSO Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 8 }}>Single Sign-On (SSO)</h2>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>
          Configure SAML 2.0 authentication with Azure Entra ID (formerly Azure AD).
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>Loading...</div>
      ) : (
        <div style={{ maxWidth: 800 }}>
          {/* Enable SSO Toggle */}
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Enable SSO</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                  Allow users to sign in with Azure Entra ID
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={samlSettings.enabled}
                  onChange={(e) => setSamlSettings({ ...samlSettings, enabled: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: t.text }}>{samlSettings.enabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Allow Local Login</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                  Allow users to sign in with username/password
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={samlSettings.allow_local_login}
                  onChange={(e) => setSamlSettings({ ...samlSettings, allow_local_login: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: t.text }}>{samlSettings.allow_local_login ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
          </div>

          {/* Service Provider Settings */}
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: t.text }}>
              Service Provider (This Application)
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Entity ID (Identifier)</label>
              <input
                type="text"
                value={samlSettings.sp_entity_id}
                onChange={(e) => setSamlSettings({ ...samlSettings, sp_entity_id: e.target.value })}
                placeholder="dda-saml"
                style={inputStyle}
              />
              <p style={hintStyle}>Unique identifier for this application (e.g., "dda-saml")</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Assertion Consumer Service (ACS) URL</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={samlSettings.sp_acs_url}
                  onChange={(e) => setSamlSettings({ ...samlSettings, sp_acs_url: e.target.value })}
                  placeholder="https://your-domain.com/api/saml/callback"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {samlSettings.sp_acs_url && (
                  <button
                    onClick={() => copyToClipboard(samlSettings.sp_acs_url)}
                    style={{
                      padding: '8px 12px',
                      background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${t.border}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                      color: t.textMuted,
                    }}
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                )}
              </div>
              <p style={hintStyle}>The URL Azure Entra will send SAML responses to (must match your callback URL)</p>
            </div>
          </div>

          {/* Identity Provider Settings */}
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: t.text }}>
              Identity Provider (Azure Entra ID)
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Entity ID (Identifier)</label>
              <input
                type="text"
                value={samlSettings.idp_entity_id}
                onChange={(e) => setSamlSettings({ ...samlSettings, idp_entity_id: e.target.value })}
                placeholder="https://sts.windows.net/{tenant-id}/"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>App Federation Metadata URL (Recommended)</label>
              <input
                type="text"
                value={samlSettings.idp_metadata_url || ''}
                onChange={(e) => setSamlSettings({ ...samlSettings, idp_metadata_url: e.target.value })}
                placeholder="https://login.microsoftonline.com/{tenant-id}/federationmetadata/2007-06/federationmetadata.xml"
                style={inputStyle}
              />
              <p style={hintStyle}>If provided, certificate and URLs will be auto-fetched from Azure. Find this in Azure Entra &gt; App registrations &gt; Your app &gt; Endpoints &gt; Federation Metadata URL</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>SSO URL (Login URL)</label>
              <input
                type="text"
                value={samlSettings.idp_sso_url}
                onChange={(e) => setSamlSettings({ ...samlSettings, idp_sso_url: e.target.value })}
                placeholder="https://login.microsoftonline.com/{tenant-id}/saml2"
                style={inputStyle}
              />
              <p style={hintStyle}>Only needed if not using Metadata URL</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Logout URL (Optional)</label>
              <input
                type="text"
                value={samlSettings.idp_slo_url}
                onChange={(e) => setSamlSettings({ ...samlSettings, idp_slo_url: e.target.value })}
                placeholder="https://login.microsoftonline.com/{tenant-id}/saml2"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>X.509 Certificate (Base64) <span style={{ color: t.textMuted }}>- Only needed if not using Metadata URL</span></label>
              <textarea
                value={samlSettings.idp_x509_cert}
                onChange={(e) => setSamlSettings({ ...samlSettings, idp_x509_cert: e.target.value })}
                placeholder="Paste the Base64-encoded certificate from Azure Entra..."
                style={textareaStyle}
              />
            </div>
          </div>

          {/* User Provisioning */}
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: t.text }}>
              User Provisioning
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Auto-Provision Users</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                  Automatically create user accounts for new SSO users
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={samlSettings.auto_provision}
                  onChange={(e) => setSamlSettings({ ...samlSettings, auto_provision: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: t.text }}>{samlSettings.auto_provision ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>

            {samlSettings.auto_provision && (
              <div>
                <label style={labelStyle}>Default Security Group</label>
                <select
                  value={samlSettings.default_group_id}
                  onChange={(e) => setSamlSettings({ ...samlSettings, default_group_id: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">User (default)</option>
                  {securityGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p style={hintStyle}>New SSO users will be assigned to this group</p>
              </div>
            )}
          </div>

          {/* Message */}
          {message.text && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16,
              background: message.type === 'success'
                ? (darkMode ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)')
                : (darkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)'),
              color: message.type === 'success' ? '#22c55e' : '#ef4444',
              fontSize: 13,
            }}>
              {message.text}
            </div>
          )}

          {/* Save Button */}
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn
              primary
              darkMode={darkMode}
              t={t}
              onClick={handleSave}
              loading={saving}
              style={{ fontSize: 13 }}
            >
              Save Settings
            </Btn>
          </div>

          {/* Instructions */}
          <div style={{
            marginTop: 32,
            padding: 24,
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
          }}>
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px', color: t.text }}>
              Azure Entra ID Setup Guide
            </h4>
            
            {/* Step 1 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: t.accent,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>1</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Create Enterprise Application in Azure</div>
              </div>
              <div style={{ marginLeft: 38, fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Go to <strong>Azure Portal</strong> (portal.azure.com)</li>
                  <li>Navigate to <strong>Azure Entra ID</strong> {" > "} <strong>Enterprise applications</strong></li>
                  <li>Click <strong>New application</strong></li>
                  <li>Click <strong>Create your own application</strong> on the left</li>
                  <li>Enter a name (e.g., "Dealer Document Archive")</li>
                  <li>Select <strong>Non-gallery application</strong></li>
                  <li>Click <strong>Create</strong></li>
                </ol>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: t.accent,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>2</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Configure SAML Single Sign-On</div>
              </div>
              <div style={{ marginLeft: 38, fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li>In your application, go to <strong>Single sign-on</strong></li>
                  <li>Select <strong>SAML</strong></li>
                  <li>In <strong>Basic SAML Configuration</strong>, click <strong>Edit</strong></li>
                </ol>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: t.accent,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>3</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Configure Service Provider Settings in Azure</div>
              </div>
              <div style={{ marginLeft: 38, fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 12px' }}>Enter these values in the Azure SAML configuration:</p>
                <div style={{
                  background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.textDim, marginBottom: 4 }}>Identifier (Entity ID)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ fontSize: 12, color: t.accent, background: 'transparent' }}>
                        {samlSettings.sp_entity_id || 'dda-saml'}
                      </code>
                      <button
                        onClick={() => copyToClipboard(samlSettings.sp_entity_id || 'dda-saml')}
                        style={{
                          padding: '4px 8px',
                          fontSize: 10,
                          background: 'transparent',
                          border: `1px solid ${t.border}`,
                          borderRadius: 4,
                          cursor: 'pointer',
                          color: t.textMuted,
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.textDIM, marginBottom: 4 }}>Reply URL (Assertion Consumer Service URL)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ fontSize: 12, color: t.accent, background: 'transparent', wordBreak: 'break-all' }}>
                        {samlSettings.sp_acs_url || 'https://your-domain.com/api/saml/callback'}
                      </code>
                      {samlSettings.sp_acs_url && (
                        <button
                          onClick={() => copyToClipboard(samlSettings.sp_acs_url)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 10,
                            background: 'transparent',
                            border: `1px solid ${t.border}`,
                            borderRadius: 4,
                            cursor: 'pointer',
                            color: t.textMuted,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p style={{ margin: 0 }}>
                  <strong>Note:</strong> Set both <strong>Sign on URL</strong> and <strong>Reply URL</strong> to the same ACS URL value.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: t.accent,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>4</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Copy Azure Values to This Form</div>
              </div>
              <div style={{ marginLeft: 38, fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 12px' }}>In Azure, go to <strong>SAML Certificates</strong> section and copy:</p>
                <div style={{
                  background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px 0', color: t.textMuted, width: 180 }}>Azure Field</td>
                        <td style={{ padding: '8px 0', color: t.text, fontWeight: 500 }}>Paste Into</td>
                      </tr>
                      <tr style={{ background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                        <td style={{ padding: '10px 8px', color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>Azure AD Identifier</td>
                        <td style={{ padding: '10px 8px', color: t.text, fontWeight: 500, borderBottom: `1px solid ${t.border}` }}>Entity ID (Identifier)</td>
                      </tr>
                      <tr style={{ background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                        <td style={{ padding: '10px 8px', color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>Login URL</td>
                        <td style={{ padding: '10px 8px', color: t.text, fontWeight: 500, borderBottom: `1px solid ${t.border}` }}>SSO URL (Login URL)</td>
                      </tr>
                      <tr style={{ background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                        <td style={{ padding: '10px 8px', color: t.textMuted }}>Certificate (Base64)</td>
                        <td style={{ padding: '10px 8px', color: t.text, fontWeight: 500 }}>X.509 Certificate</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p style={{ margin: 0 }}>
                  Click <strong>Download</strong> next to the certificate to get the Base64 value, then paste it into the certificate field above.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: t.accent,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>5</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Configure User Attributes (Optional)</div>
              </div>
              <div style={{ marginLeft: 38, fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 12px' }}>
                  In Azure, under <strong>Attributes {"&"} Claims</strong>, you can customize which attributes are sent:
                </p>
                <div style={{
                  background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 8,
                  padding: 16,
                }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted, fontWeight: 600 }}>Claim Name</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: t.textMuted, fontWeight: 600 }}>Maps To</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px', color: t.text, borderBottom: `1px solid ${t.border}` }}>emailaddress</td>
                        <td style={{ padding: '8px', color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>User email</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px', color: t.text, borderBottom: `1px solid ${t.border}` }}>name</td>
                        <td style={{ padding: '8px', color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>Display name</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px', color: t.text }}>userprincipalname</td>
                        <td style={{ padding: '8px', color: t.textMuted }}>Username</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Step 6 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: t.accent,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>6</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Assign Users and Test</div>
              </div>
              <div style={{ marginLeft: 38, fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li>In Azure, go to <strong>Users and groups</strong></li>
                  <li>Click <strong>Add user/group</strong> to assign users</li>
                  <li>Save your settings above</li>
                  <li>Enable SSO toggle above</li>
                  <li>Test by clicking <strong>"Sign in with SSO"</strong> on the login page</li>
                </ol>
              </div>
            </div>

            {/* Troubleshooting */}
            <div style={{
              marginTop: 24,
              padding: 16,
              background: darkMode ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
              border: `1px solid ${darkMode ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'}`,
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>Troubleshooting</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: t.textMuted, lineHeight: 1.7 }}>
                <li><strong>ACS URL Error:</strong> Ensure the Reply URL in Azure matches exactly (including https://)</li>
                <li><strong>Certificate Error:</strong> Copy only the Base64 content, without the BEGIN/END lines</li>
                <li><strong>User Not Created:</strong> Enable "Auto-Provision Users" or create the user manually first</li>
                <li><strong>Attributes Missing:</strong> Verify claim names match the attribute mapping settings above</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsSection({ t, darkMode, addToast }) {
  const [darkLogo, setDarkLogo] = useState(null);
  const [lightLogo, setLightLogo] = useState(null);
  const [uploading, setUploading] = useState({ dark: false, light: false});
  const darkInputRef = useRef(null);
  const lightInputRef = useRef(null);

  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    from_email: '',
    from_name: '',
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [smtpMessage, setSmtpMessage] = useState({ type: '', text: '' });

  const [supportEmail, setSupportEmail] = useState('');
  const [supportEmailSaving, setSupportEmailSaving] = useState(false);
  const [supportEmailMessage, setSupportEmailMessage] = useState({ type: '', text: '' });

  const [emailSignature, setEmailSignature] = useState('');
  const [emailBrandColor, setEmailBrandColor] = useState('#0891b2');
  const [emailSubjectPrefix, setEmailSubjectPrefix] = useState('[Help Ticket]');
  const [emailSettingsSaving, setEmailSettingsSaving] = useState(false);
  const [emailSettingsMessage, setEmailSettingsMessage] = useState({ type: '', text: '' });

  const [sslCertificates, setSslCertificates] = useState([]);
  const [sslLoading, setSslLoading] = useState(false);
  const [sslUploading, setSslUploading] = useState(false);
  const [sslDeleting, setSslDeleting] = useState(null);
  const [sslActivating, setSslActivating] = useState(null);
  const [newCertName, setNewCertName] = useState('');
  const [newCertFile, setNewCertFile] = useState(null);
  const [newKeyFile, setNewKeyFile] = useState(null);
  const [newPassphrase, setNewPassphrase] = useState('');
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);
  const sslInputRef = useRef(null);
  const sslKeyInputRef = useRef(null);

  useEffect(() => {
    loadLogos();
    loadSmtpSettings();
    loadSupportEmail();
    loadEmailSettings();
    loadSslCertificates();
  }, []);

  const loadSslCertificates = async () => {
    setSslLoading(true);
    try {
      const data = await api.getSslCertificates();
      setSslCertificates(data.certificates || []);
    } catch (err) {
      console.error("Failed to load SSL certificates:", err);
    } finally {
      setSslLoading(false);
    }
  };

  const loadLogos = async () => {
    try {
      const logos = await api.getLogos();
      setDarkLogo(logos.darkLogo);
      setLightLogo(logos.lightLogo);
    } catch (err) {
      console.error("Failed to load logos:", err);
    }
  };

  const loadSmtpSettings = async () => {
    setSmtpLoading(true);
    try {
      const settings = await api.getSmtpSettings();
      setSmtpSettings({
        host: settings.host || '',
        port: settings.port || 587,
        secure: settings.secure || false,
        username: settings.username || '',
        password: settings.password || '',
        from_email: settings.from_email || '',
        from_name: settings.from_name || '',
      });
    } catch (err) {
      console.error("Failed to load SMTP settings:", err);
    } finally {
      setSmtpLoading(false);
    }
  };

  const loadSupportEmail = async () => {
    try {
      const data = await api.getSupportEmail();
      setSupportEmail(data.email || '');
    } catch (err) {
      console.error("Failed to load support email:", err);
    }
  };

  const loadEmailSettings = async () => {
    try {
      const data = await api.getEmailSettings();
      setEmailSignature(data.signature || '');
      setEmailBrandColor(data.brandColor || '#0891b2');
      setEmailSubjectPrefix(data.subjectPrefix || '[Help Ticket]');
    } catch (err) {
      console.error("Failed to load email settings:", err);
    }
  };

  const handleUpload = async (type, file) => {
    if (!file) return;
    setUploading((prev) => ({ ...prev, [type]: true }));
    try {
      await api.uploadLogo(type, file);
      await loadLogos();
    } catch (err) {
      console.error("Failed to upload logo:", err);
      alert("Failed to upload logo: " + (err.message || "Unknown error"));
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSaveSmtp = async () => {
    setSmtpSaving(true);
    setSmtpMessage({ type: '', text: '' });
    try {
      await api.saveSmtpSettings(smtpSettings);
      setSmtpMessage({ type: 'success', text: 'SMTP settings saved successfully!' });
    } catch (err) {
      setSmtpMessage({ type: 'error', text: 'Failed to save: ' + (err.message || 'Unknown error') });
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) {
      setSmtpMessage({ type: 'error', text: 'Please enter a test email address' });
      return;
    }
    setSmtpTesting(true);
    setSmtpMessage({ type: '', text: '' });
    try {
      await api.testSmtpEmail(testEmail);
      setSmtpMessage({ type: 'success', text: 'Test email sent successfully!' });
    } catch (err) {
      setSmtpMessage({ type: 'error', text: 'Failed to send: ' + (err.message || 'Unknown error') });
    } finally {
      setSmtpTesting(false);
    }
  };

  return (
    <div>
      {/* Branding Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 8 }}>Branding</h2>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>
          Upload logos to customize the appearance of the landing page.
        </p>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 40 }}>
        {/* Dark Mode Logo */}
        <div style={{ flex: 1, minWidth: 280, maxWidth: 400 }}>
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
              Dark Mode Logo
            </label>
            <p style={{ fontSize: 11, color: t.textDim, margin: "0 0 16px" }}>
              Displayed when dark mode is active. Recommended: PNG or SVG with transparent background.
            </p>
            <div style={{
              background: darkMode ? "#1a1a1a" : "#f5f5f5",
              borderRadius: 8,
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 80,
              marginBottom: 16,
            }}>
              {darkLogo ? (
                <img
                  src={`${darkLogo}?t=${Date.now()}`}
                  alt="Dark Mode Logo"
                  style={{ maxHeight: 60, maxWidth: "100%", objectFit: "contain" }}
                  onError={() => setDarkLogo(null)}
                />
              ) : (
                <span style={{ fontSize: 12, color: t.textMuted }}>No logo uploaded</span>
              )}
            </div>
            <input
              ref={darkInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              style={{ display: "none" }}
              onChange={(e) => handleUpload("dark", e.target.files[0])}
            />
            <Btn
              darkMode={darkMode}
              t={t}
              onClick={() => darkInputRef.current?.click()}
              loading={uploading.dark}
              style={{ width: "100%", fontSize: 12 }}
            >
              <UploadCloudIcon size={14} /> Upload Dark Logo
            </Btn>
          </div>
        </div>

        {/* Light Mode Logo */}
        <div style={{ flex: 1, minWidth: 280, maxWidth: 400 }}>
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
              Light Mode Logo
            </label>
            <p style={{ fontSize: 11, color: t.textDim, margin: "0 0 16px" }}>
              Displayed when light mode is active. Recommended: PNG or SVG with transparent background.
            </p>
            <div style={{
              background: darkMode ? "#f5f5f5" : "#ffffff",
              borderRadius: 8,
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 80,
              marginBottom: 16,
              border: `1px solid ${t.border}`,
            }}>
              {lightLogo ? (
                <img
                  src={`${lightLogo}?t=${Date.now()}`}
                  alt="Light Mode Logo"
                  style={{ maxHeight: 60, maxWidth: "100%", objectFit: "contain" }}
                  onError={() => setLightLogo(null)}
                />
              ) : (
                <span style={{ fontSize: 12, color: "#666" }}>No logo uploaded</span>
              )}
            </div>
            <input
              ref={lightInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              style={{ display: "none" }}
              onChange={(e) => handleUpload("light", e.target.files[0])}
            />
            <Btn
              darkMode={darkMode}
              t={t}
              onClick={() => lightInputRef.current?.click()}
              loading={uploading.light}
              style={{ width: "100%", fontSize: 12 }}
            >
              <UploadCloudIcon size={14} /> Upload Light Logo
            </Btn>
          </div>
        </div>
      </div>

      {/* SMTP Settings Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 8 }}>Email Settings (SMTP)</h2>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>
          Configure SMTP settings for sending emails to users.
        </p>
      </div>

      {smtpLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Loading...</div>
      ) : (
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: 24,
          maxWidth: 600,
        }}>
          {/* Host */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
              SMTP Host
            </label>
            <input
              type="text"
              value={smtpSettings.host}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
              placeholder="smtp.example.com"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                background: darkMode ? "#1a1a1a" : "#fff",
                color: t.text,
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Port and Secure */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
                Port
              </label>
              <input
                type="number"
                value={smtpSettings.port}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, port: parseInt(e.target.value) || 587 })}
                placeholder="587"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  background: darkMode ? "#1a1a1a" : "#fff",
                  color: t.text,
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", paddingTop: 32 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={smtpSettings.secure}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, secure: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span style={{ fontSize: 13, color: t.text }}>Use SSL/TLS</span>
              </label>
            </div>
          </div>

          {/* Username */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
              Username
            </label>
            <input
              type="text"
              value={smtpSettings.username}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, username: e.target.value })}
              placeholder="your-email@example.com"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                background: darkMode ? "#1a1a1a" : "#fff",
                color: t.text,
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
              Password
            </label>
            <input
              type="password"
              value={smtpSettings.password}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                background: darkMode ? "#1a1a1a" : "#fff",
                color: t.text,
                fontFamily: "inherit",
              }}
            />
            <p style={{ fontSize: 11, color: t.textDim, margin: "4px 0 0" }}>
              Leave unchanged to keep existing password
            </p>
          </div>

          {/* From Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
              From Name
            </label>
            <input
              type="text"
              value={smtpSettings.from_name}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, from_name: e.target.value })}
              placeholder="Dealer Document Archive"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                background: darkMode ? "#1a1a1a" : "#fff",
                color: t.text,
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* From Email */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
              From Email
            </label>
            <input
              type="email"
              value={smtpSettings.from_email}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, from_email: e.target.value })}
              placeholder="noreply@example.com"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                background: darkMode ? "#1a1a1a" : "#fff",
                color: t.text,
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Message */}
          {smtpMessage.text && (
            <div style={{
              padding: "12px 16px",
              borderRadius: 8,
              marginBottom: 16,
              background: smtpMessage.type === 'success' 
                ? (darkMode ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)")
                : (darkMode ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)"),
              color: smtpMessage.type === 'success' ? "#22c55e" : "#ef4444",
              fontSize: 13,
            }}>
              {smtpMessage.text}
            </div>
          )}

          {/* Save Button */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Btn
              primary
              darkMode={darkMode}
              t={t}
              onClick={handleSaveSmtp}
              loading={smtpSaving}
              style={{ fontSize: 13 }}
            >
              Save Settings
            </Btn>
          </div>

          {/* Test Email Section */}
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${t.border}` }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px", color: t.text }}>
              Test Email
            </h3>
            <p style={{ fontSize: 12, color: t.textMuted, margin: "0 0 12px" }}>
              Send a test email to verify your SMTP settings are working correctly.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontSize: 14,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  background: darkMode ? "#1a1a1a" : "#fff",
                  color: t.text,
                  fontFamily: "inherit",
                }}
              />
              <Btn
                darkMode={darkMode}
                t={t}
                onClick={handleTestSmtp}
                loading={smtpTesting}
                style={{ fontSize: 13 }}
              >
                Send Test
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Support Email Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 8 }}>Support Email</h2>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>
          Set the email address where help ticket submissions will be sent.
        </p>
      </div>

      <div style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: 24,
        maxWidth: 600,
      }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
            Support Email Address
          </label>
          <input
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            placeholder="support@yourcompany.com"
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 14,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              background: darkMode ? "#1a1a1a" : "#fff",
              color: t.text,
              fontFamily: "inherit",
            }}
          />
          <p style={{ fontSize: 11, color: t.textDim, margin: "4px 0 0" }}>
            Help tickets submitted by users will be sent to this email address.
          </p>
        </div>

        {supportEmailMessage.text && (
          <div style={{
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            background: supportEmailMessage.type === 'success'
              ? (darkMode ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)")
              : (darkMode ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)"),
            color: supportEmailMessage.type === 'success' ? "#22c55e" : "#ef4444",
            fontSize: 13,
          }}>
            {supportEmailMessage.text}
          </div>
        )}

        <Btn
          primary
          darkMode={darkMode}
          t={t}
          onClick={async () => {
            setSupportEmailSaving(true);
            setSupportEmailMessage({ type: '', text: '' });
            try {
              await api.setSupportEmail(supportEmail);
              setSupportEmailMessage({ type: 'success', text: 'Support email saved successfully!' });
            } catch (err) {
              setSupportEmailMessage({ type: 'error', text: 'Failed to save: ' + (err.message || 'Unknown error') });
            } finally {
              setSupportEmailSaving(false);
            }
          }}
          loading={supportEmailSaving}
          style={{ fontSize: 13 }}
        >
          Save Support Email
        </Btn>
      </div>

      {/* Email Signature Section */}
      <div style={{ marginTop: 40, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 8 }}>Email Signature & Branding</h2>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>
          Customize the appearance and signature of emails sent from the application.
        </p>
      </div>

      <div style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: 24,
        maxWidth: 700,
      }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
            Brand Color
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="color"
              value={emailBrandColor}
              onChange={(e) => setEmailBrandColor(e.target.value)}
              style={{
                width: 50,
                height: 36,
                border: `1px solid ${t.border}`,
                borderRadius: 6,
                cursor: "pointer",
                background: "transparent",
              }}
            />
            <input
              type="text"
              value={emailBrandColor}
              onChange={(e) => setEmailBrandColor(e.target.value)}
              placeholder="#0891b2"
              style={{
                width: 120,
                padding: "8px 12px",
                fontSize: 14,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                background: darkMode ? "#1a1a1a" : "#fff",
                color: t.text,
                fontFamily: "monospace",
              }}
            />
            <span style={{ fontSize: 12, color: t.textMuted }}>
              Used for headings and accents in emails
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
            Email Subject Prefix
          </label>
          <input
            type="text"
            value={emailSubjectPrefix}
            onChange={(e) => setEmailSubjectPrefix(e.target.value)}
            placeholder="[Help Ticket]"
            style={{
              width: "100%",
              maxWidth: 300,
              padding: "10px 12px",
              fontSize: 14,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              background: darkMode ? "#1a1a1a" : "#fff",
              color: t.text,
              fontFamily: "inherit",
            }}
          />
          <p style={{ fontSize: 11, color: t.textDim, margin: "4px 0 0" }}>
            This prefix will be added to the beginning of help ticket email subjects. Leave empty for no prefix.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
            Email Signature
          </label>
          <textarea
            value={emailSignature}
            onChange={(e) => setEmailSignature(e.target.value)}
            placeholder="Best regards,&#10;Your Company Name&#10;Support Team"
            rows={4}
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: 14,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              background: darkMode ? "#1a1a1a" : "#fff",
              color: t.text,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
          <p style={{ fontSize: 11, color: t.textDim, margin: "4px 0 0" }}>
            This signature will be added to the bottom of all emails sent from the application.
          </p>
        </div>

        {/* Preview */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
            Email Preview
          </label>
          <div style={{
            background: "#fff",
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            padding: 20,
            fontFamily: "Arial, sans-serif",
          }}>
            <div style={{
              padding: "16px 0",
              borderBottom: `2px solid ${emailBrandColor}`,
              marginBottom: 16,
            }}>
              <h2 style={{ margin: 0, color: emailBrandColor, fontSize: 18 }}>
                Help Ticket Submission
              </h2>
            </div>
            <p style={{ margin: "0 0 8px", color: "#374151", fontSize: 14 }}>
              <strong>From:</strong> John Doe &lt;john@example.com&gt;
            </p>
            <p style={{ margin: "0 0 8px", color: "#374151", fontSize: 14 }}>
              <strong>Subject:</strong> {emailSubjectPrefix ? `${emailSubjectPrefix} ` : ''}Example Subject
            </p>
            <div style={{
              background: "#f9fafb",
              padding: 16,
              borderRadius: 8,
              margin: "16px 0",
              color: "#374151",
              fontSize: 14,
            }}>
              This is an example message body...
            </div>
            {emailSignature && (
              <div style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid #e5e7eb",
                color: "#6b7280",
                fontSize: 13,
                whiteSpace: "pre-wrap",
              }}>
                {emailSignature}
              </div>
            )}
          </div>
        </div>

        {emailSettingsMessage.text && (
          <div style={{
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            background: emailSettingsMessage.type === 'success'
              ? (darkMode ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)")
              : (darkMode ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)"),
            color: emailSettingsMessage.type === 'success' ? "#22c55e" : "#ef4444",
            fontSize: 13,
          }}>
            {emailSettingsMessage.text}
          </div>
        )}

        <Btn
          primary
          darkMode={darkMode}
          t={t}
          onClick={async () => {
            setEmailSettingsSaving(true);
            setEmailSettingsMessage({ type: '', text: '' });
            try {
              await api.setEmailSettings(emailSignature, emailBrandColor, emailSubjectPrefix);
              setEmailSettingsMessage({ type: 'success', text: 'Email settings saved successfully!' });
            } catch (err) {
              setEmailSettingsMessage({ type: 'error', text: 'Failed to save: ' + (err.message || 'Unknown error') });
            } finally {
              setEmailSettingsSaving(false);
            }
          }}
          loading={emailSettingsSaving}
          style={{ fontSize: 13 }}
        >
          Save Email Settings
        </Btn>
      </div>

      {/* SSL Certificates Section */}
      <div style={{ marginBottom: 24, marginTop: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 8 }}>SSL Certificates</h2>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>
          Upload and manage SSL certificates for HTTPS. Both certificate and private key files are required.
        </p>
      </div>

      {showRestartPrompt && (
        <div style={{
          marginBottom: 16,
          padding: "12px 16px",
          borderRadius: 8,
          background: darkMode ? "rgba(234,179,8,0.15)" : "rgba(234,179,8,0.1)",
          border: `1px solid ${darkMode ? "rgba(234,179,8,0.3)" : "rgba(234,179,8,0.2)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#eab308" }}>⚠️</span>
            <span style={{ fontSize: 13, color: t.text }}>
              <strong>Restart required:</strong> The server must be restarted for certificate changes to take effect.
            </span>
          </div>
          <button
            onClick={() => setShowRestartPrompt(false)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: t.textMuted,
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {sslLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Loading...</div>
      ) : (
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: 24,
          maxWidth: 700,
        }}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
              Upload New Certificate
            </label>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={newCertName}
                onChange={(e) => setNewCertName(e.target.value)}
                placeholder="Certificate name (e.g., domain.com)"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  background: darkMode ? "#1a1a1a" : "#fff",
                  color: t.text,
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, display: "block", marginBottom: 4 }}>
                  Certificate File *
                </label>
                <input
                  type="file"
                  accept=".crt,.pem,.cer"
                  onChange={(e) => setNewCertFile(e.target.files[0] || null)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: 12,
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    background: darkMode ? "#1a1a1a" : "#fff",
                    color: t.text,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                {newCertFile && (
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                    Selected: {newCertFile.name}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, display: "block", marginBottom: 4 }}>
                  Private Key File *
                </label>
                <input
                  type="file"
                  accept=".key,.pem"
                  onChange={(e) => setNewKeyFile(e.target.files[0] || null)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: 12,
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    background: darkMode ? "#1a1a1a" : "#fff",
                    color: t.text,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                {newKeyFile && (
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                    Selected: {newKeyFile.name}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, display: "block", marginBottom: 4 }}>
                Private Key Passphrase (optional)
              </label>
              <input
                type="password"
                value={newPassphrase}
                onChange={(e) => setNewPassphrase(e.target.value)}
                placeholder="Leave empty if key has no passphrase"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  background: darkMode ? "#1a1a1a" : "#fff",
                  color: t.text,
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <Btn
              darkMode={darkMode}
              t={t}
              onClick={async () => {
                if (!newCertFile || !newKeyFile) {
                  addToast("Missing files", "Both certificate and private key files are required", 5000, "error");
                  return;
                }
                const name = newCertName.trim() || newCertFile.name.replace(/\.[^/.]+$/, "");
                setSslUploading(true);
                try {
                  await api.uploadSslCertificate(name, newCertFile, newKeyFile, newPassphrase || undefined);
                  addToast("Certificate uploaded", `"${name}" has been uploaded successfully`, 4000, "create");
                  setNewCertName("");
                  setNewCertFile(null);
                  setNewKeyFile(null);
                  setNewPassphrase("");
                  loadSslCertificates();
                } catch (err) {
                  addToast("Upload failed", err.message || "Failed to upload certificate", 5000, "error");
                } finally {
                  setSslUploading(false);
                }
              }}
              loading={sslUploading}
              disabled={!newCertFile || !newKeyFile}
              style={{ fontSize: 12 }}
            >
              <UploadCloudIcon size={14} /> Upload Certificate
            </Btn>
            <p style={{ fontSize: 11, color: t.textDim, margin: "8px 0 0" }}>
              Certificate formats: .crt, .pem, .cer | Key formats: .key, .pem
            </p>
          </div>

          {sslCertificates.length > 0 && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 12 }}>
                Uploaded Certificates
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sslCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    style={{
                      padding: 16,
                      background: cert.isActive
                        ? (darkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.05)")
                        : (darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                      border: `1px solid ${cert.isActive ? "#22c55e" : t.border}`,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: cert.isActive ? "#22c55e" : (darkMode ? "#444" : "#ccc"),
                        }} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>
                          {cert.name}
                          {cert.isActive && (
                            <span style={{
                              marginLeft: 8,
                              fontSize: 11,
                              fontWeight: 500,
                              color: "#22c55e",
                              background: darkMode ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)",
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}>
                              Active
                            </span>
                          )}
                          {!cert.hasKey && !cert.isActive && (
                            <span style={{
                              marginLeft: 8,
                              fontSize: 11,
                              fontWeight: 500,
                              color: "#f97316",
                              background: darkMode ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.1)",
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}>
                              Missing Key
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn
                          darkMode={darkMode}
                          t={t}
                          onClick={async () => {
                            if (!cert.hasKey) {
                              addToast("Cannot activate", "Certificate requires a private key file to activate", 5000, "error");
                              return;
                            }
                            setSslActivating(cert.id);
                            try {
                              if (cert.isActive) {
                                await api.deactivateSslCertificates();
                                addToast("Certificate deactivated", "Reverted to default certificate", 4000, "update");
                                setShowRestartPrompt(true);
                              } else {
                                const result = await api.activateSslCertificate(cert.id);
                                addToast("Certificate activated", `"${cert.name}" is now active. Restart required.`, 4000, "update");
                                setShowRestartPrompt(true);
                              }
                              loadSslCertificates();
                            } catch (err) {
                              addToast("Error", err.message || "Failed to update certificate status", 5000, "error");
                            } finally {
                              setSslActivating(null);
                            }
                          }}
                          loading={sslActivating === cert.id}
                          style={{
                            fontSize: 11,
                            padding: "6px 12px",
                            background: cert.isActive ? "#ef4444" : (cert.hasKey ? "#22c55e" : "#9ca3af"),
                            borderColor: cert.isActive ? "#ef4444" : (cert.hasKey ? "#22c55e" : "#9ca3af"),
                            color: "#fff",
                            cursor: cert.hasKey ? "pointer" : "not-allowed",
                          }}
                        >
                          {cert.isActive ? "Deactivate" : "Activate"}
                        </Btn>
                        <Btn
                          darkMode={darkMode}
                          t={t}
                          onClick={async () => {
                            if (!window.confirm(`Delete certificate "${cert.name}"${cert.isActive ? " (This will revert to default)" : ""}?`)) return;
                            setSslDeleting(cert.id);
                            try {
                              await api.deleteSslCertificate(cert.id);
                              addToast("Certificate deleted", `"${cert.name}" has been removed`, 4000, "delete");
                              if (cert.isActive) setShowRestartPrompt(true);
                              loadSslCertificates();
                            } catch (err) {
                              addToast("Delete failed", err.message || "Failed to delete certificate", 5000, "error");
                            } finally {
                              setSslDeleting(null);
                            }
                          }}
                          loading={sslDeleting === cert.id}
                          style={{ fontSize: 11, padding: "6px 12px" }}
                        >
                          <TrashIcon size={12} />
                        </Btn>
                      </div>
                    </div>
                    {cert.subject && (
                      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>Subject:</span> {cert.subject}
                      </div>
                    )}
                    {cert.issuer && (
                      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>Issuer:</span> {cert.issuer}
                      </div>
                    )}
                    {cert.validFrom && cert.validTo && (
                      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>Valid:</span> {new Date(cert.validFrom).toLocaleDateString()} - {new Date(cert.validTo).toLocaleDateString()}
                        {new Date(cert.validTo) < new Date() && (
                          <span style={{ color: "#ef4444", marginLeft: 8 }}> (Expired)</span>
                        )}
                      </div>
                    )}
                    {cert.fingerprint && (
                      <div style={{ fontSize: 11, color: t.textDim, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>Fingerprint:</span> {cert.fingerprint.substring(0, 23)}...
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: t.textDim }}>
                      {cert.filename}
                      {cert.keyFilename && <span> + {cert.keyFilename}</span>}
                      {cert.hasPassphrase && <span style={{ color: "#f97316" }}> (passphrase protected)</span>}
                      <span> · Uploaded {new Date(cert.uploadedAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sslCertificates.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: t.textMuted }}>
              <LockIcon size={32} />
              <p style={{ fontSize: 13, margin: "12px 0 0" }}>No SSL certificates uploaded</p>
              <p style={{ fontSize: 12, margin: "8px 0 0" }}>Using default certificate bydefault</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DmsSection({ t, darkMode, addToast }) {
  const [settings, setSettings] = useState({
    server: '',
    port: 1433,
    database: '',
    username: '',
    password: '',
    trustCertificate: false,
    encryptConnection: true,
    queryIntervalMinutes: 5,
  });
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadSettings();
    loadSchedules();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getDmsSettings();
      setSettings({
        server: data.server || '',
        port: data.port || 1433,
        database: data.database || '',
        username: data.username || '',
        password: data.password || '',
        trustCertificate: data.trustCertificate || false,
        encryptConnection: data.encryptConnection !== false,
        queryIntervalMinutes: data.queryIntervalMinutes || 5,
      });
    } catch (err) {
      console.error('Failed to load DMS settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const data = await api.getDmsSchedules();
      setSchedules(data);
    } catch (err) {
      console.error('Failed to load DMS schedules:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveDmsSettings(settings);
      addToast('Settings saved', 'DMS connection settings saved successfully', 4000, 'create');
    } catch (err) {
      addToast('Save failed', err.message || 'Failed to save settings', 5000, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!settings.server.trim()) {
      addToast('Server required', 'Please enter a server address', 4000, 'error');
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testDmsConnection(settings);
      setTestResult({ success: true, message: result.message || 'Connection successful!' });
      addToast('Connection successful', 'Successfully connected to the SQL Server', 4000, 'create');
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Connection failed' });
      addToast('Connection failed', err.message || 'Failed to connect to the SQL Server', 5000, 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleToggleSchedule = async (scheduleId, enabled) => {
    try {
      await api.updateDmsSchedule(scheduleId, { enabled });
      setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, enabled } : s));
      addToast(enabled ? 'Schedule enabled' : 'Schedule disabled', `Schedule has been ${enabled ? 'enabled' : 'disabled'}`, 4000, 'create');
    } catch (err) {
      addToast('Error', err.message || 'Failed to update schedule', 5000, 'error');
    }
  };

  const handleUpdateInterval = async (scheduleId, intervalMinutes) => {
    try {
      await api.updateDmsSchedule(scheduleId, { intervalMinutes });
      setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, intervalMinutes } : s));
    } catch (err) {
      addToast('Error', err.message || 'Failed to update interval', 5000, 'error');
    }
  };

  const handleRunSchedule = async (scheduleId) => {
    try {
      const result = await api.runDmsSchedule(scheduleId);
      addToast('Task completed', result.message || 'Schedule ran successfully', 4000, 'create');
      loadSchedules();
    } catch (err) {
      addToast('Error', err.message || 'Failed to run schedule', 5000, 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    background: darkMode ? '#1a1a1a' : '#fff',
    color: t.text,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: t.text,
    display: 'block',
    marginBottom: 8,
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 8 }}>DMS Connection</h2>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>
          Connect to a Microsoft SQL Server to query documents from your Document Management System.
        </p>
      </div>

      <div style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
      }}>
        {/* Connection Status */}
        {testResult && (
          <div style={{
            marginBottom: 24,
            padding: '12px 16px',
            borderRadius: 8,
            background: testResult.success 
              ? (darkMode ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)')
              : (darkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)'),
            border: `1px solid ${testResult.success ? t.success : t.error}`,
            color: testResult.success ? t.success : t.error,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {testResult.success ? 'Connection Successful' : 'Connection Failed'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{testResult.message}</div>
          </div>
        )}

        {/* Server Configuration */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Server Address</label>
            <input
              type="text"
              value={settings.server}
              onChange={(e) => setSettings({ ...settings, server: e.target.value })}
              placeholder="e.g., 192.168.1.100 or sqlserver.example.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Port</label>
            <input
              type="number"
              value={settings.port}
              onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) || 1433 })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Database Name</label>
          <input
            type="text"
            value={settings.database}
            onChange={(e) => setSettings({ ...settings, database: e.target.value })}
            placeholder="Database name"
            style={inputStyle}
          />
        </div>

        {/* Authentication */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={settings.username}
              onChange={(e) => setSettings({ ...settings, username: e.target.value })}
              placeholder="SQL Server username"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={settings.password}
              onChange={(e) => setSettings({ ...settings, password: e.target.value })}
              placeholder="••••••••••••"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Connection Options */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.encryptConnection}
              onChange={(e) => setSettings({ ...settings, encryptConnection: e.target.checked })}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, color: t.text }}>Encrypt connection (recommended)</span>
          </label>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.trustCertificate}
              onChange={(e) => setSettings({ ...settings, trustCertificate: e.target.checked })}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, color: t.text }}>Trust server certificate</span>
          </label>
          <p style={{ fontSize: 11, color: t.textMuted, marginTop: 4, marginLeft: 24 }}>
            Enable if your SQL Server uses a self-signed certificate
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Btn
            primary
            t={t}
            darkMode={darkMode}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Btn>
          <Btn
            t={t}
            darkMode={darkMode}
            onClick={handleTest}
            disabled={testing || !settings.server.trim()}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </Btn>
        </div>
      </div>

      {/* Schedules Section */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Scheduled Tasks</h3>
        <p style={{ fontSize: 13, color: t.textMuted, margin: '0 0 16px' }}>
          Configure automatic data sync from DMS to DDA.
        </p>

        {schedules.length === 0 ? (
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
            color: t.textMuted,
          }}>
            No scheduled tasks configured. Run the migration to add default tasks.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{schedule.name}</div>
                    <div style={{ fontSize: 12, color: t.textMuted }}>{schedule.description}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={schedule.enabled}
                        onChange={(e) => handleToggleSchedule(schedule.id, e.target.checked)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500, color: schedule.enabled ? t.success : t.textMuted }}>
                        {schedule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Interval (minutes):</label>
                    <input
                      type="number"
                      value={schedule.intervalMinutes || 0}
                      onChange={(e) => handleUpdateInterval(schedule.id, parseInt(e.target.value) || 0)}
                      min={0}
                      max={1440}
                      disabled={!schedule.enabled}
                      style={{
                        width: 80,
                        padding: '6px 10px',
                        fontSize: 13,
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        background: schedule.enabled ? (darkMode ? '#1a1a1a' : '#fff') : (darkMode ? '#2a2a2a' : '#f5f5f5'),
                        color: t.text,
                        fontFamily: 'inherit',
                        opacity: schedule.enabled ? 1 : 0.5,
                      }}
                    />
                    <span style={{ fontSize: 11, color: t.textMuted }}>{schedule.intervalMinutes === 0 ? '(manual only)' : ''}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: t.textMuted }}>
                    <span style={{ fontWeight: 600 }}>Last run:</span>{' '}
                    <span style={{ 
                      color: schedule.lastRunStatus === 'success' ? t.success 
                           : schedule.lastRunStatus === 'failed' ? t.error 
                           : t.textMuted 
                    }}>
                      {formatDate(schedule.lastRunAt)}
                    </span>
                  </div>
                  {schedule.lastRunCount > 0 && (
                    <div style={{ fontSize: 12, color: t.textMuted }}>
                      <span style={{ fontWeight: 600 }}>Created:</span> {schedule.lastRunCount} folders
                    </div>
                  )}
                </div>

                {schedule.lastRunMessage && (
                  <div style={{
                    fontSize: 11,
                    color: schedule.lastRunStatus === 'failed' ? t.error : t.textMuted,
                    marginBottom: 12,
                    padding: '8px 12px',
                    background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: 6,
                    border: `1px solid ${t.border}`,
                  }}>
                    {schedule.lastRunMessage}
                  </div>
                )}

                <Btn
                  t={t}
                  darkMode={darkMode}
                  onClick={() => handleRunSchedule(schedule.id)}
                  style={{ fontSize: 12 }}
                >
                  Run Now
                </Btn>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div style={{
        background: darkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
        border: `1px solid ${darkMode ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'}`,
        borderRadius: 8,
        padding: 16,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#3b82f6' }}>
          Connection Requirements
        </h3>
        <ul style={{ fontSize: 12, color: t.textMuted, margin: 0, paddingLeft: 20 }}>
          <li style={{ marginBottom: 4 }}>The SQL Server must be accessible from this server</li>
          <li style={{ marginBottom: 4 }}>SQL Server Authentication must be enabled (Windows Authentication not supported)</li>
          <li style={{ marginBottom: 4 }}>Default port is 1433 - change if your server uses a different port</li>
          <li>For Azure SQL Database, use the full server name (e.g., myserver.database.windows.net)</li>
        </ul>
      </div>
    </div>
  );
}

function AppCenterSection({ t, darkMode, addToast }) {
  const [customApps, setCustomApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingApp, setAddingApp] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppAbbr, setNewAppAbbr] = useState("");
  const [newAppLink, setNewAppLink] = useState("");
  const [editingAppId, setEditingAppId] = useState(null);
  const [editingAppName, setEditingAppName] = useState("");
  const [editingAppAbbr, setEditingAppAbbr] = useState("");
  const [editingAppLink, setEditingAppLink] = useState("");

  useEffect(() => {
    loadCustomApps();
  }, []);

  const loadCustomApps = async () => {
    setLoading(true);
    try {
      const apps = await api.getCustomApps();
      setCustomApps(apps);
    } catch (err) {
      console.error("Failed to load custom apps:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddApp = async () => {
    const name = newAppName.trim();
    const abbr = newAppAbbr.trim().toUpperCase();
    const link = newAppLink.trim();
    if (!name || !abbr || !link) return;
    if (abbr.length > 4) { addToast("Error", "Abbreviation must be 4 characters or less", 4000, "error"); return; }
    try {
      const created = await api.createCustomApp(name, abbr, link);
      setCustomApps((prev) => [...prev, created]);
      setNewAppName("");
      setNewAppAbbr("");
      setNewAppLink("");
      setAddingApp(false);
      addToast("App created", `"${name}" has been created`, 4000, "create");
    } catch (err) {
      console.error("Failed to create app:", err);
      addToast("Error", "Failed to create app", 4000, "error");
    }
  };

  const handleUpdateApp = async (id) => {
    const name = editingAppName.trim();
    const abbr = editingAppAbbr.trim().toUpperCase();
    const link = editingAppLink.trim();
    if (!name || !abbr || !link) return;
    if (abbr.length > 4) { addToast("Error", "Abbreviation must be 4 characters or less", 4000, "error"); return; }
    try {
      const updated = await api.updateCustomApp(id, name, abbr, link);
      setCustomApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingAppId(null);
      addToast("App updated", `"${name}" has been updated`, 4000, "create");
    } catch (err) {
      console.error("Failed to update app:", err);
    }
  };

  const handleDeleteApp = async (app) => {
    try {
      await api.deleteCustomApp(app.id);
      setCustomApps((prev) => prev.filter((a) => a.id !== app.id));
      addToast("App deleted", `"${app.name}" has been deleted`, 4000, "delete");
    } catch (err) {
      console.error("Failed to delete app:", err);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    background: darkMode ? "#1a1a1a" : "#fff",
    color: t.text,
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Loading...</div>;
  }

  return (
    <div style={{ animation: "fadeIn 0.25s ease" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 8 }}>Custom Applications</h2>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>
          Create custom app shortcuts that appear on the landing page. When users click an app, they will be redirected to the specified link.
        </p>
      </div>

      {addingApp && (
        <div style={{
          background: t.surface,
          border: `1px solid ${t.accent}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          boxShadow: `0 0 0 3px ${t.accentSoft}`,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <PlusIcon size={16} /> New Custom App
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>
                App Name
              </label>
              <input
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                placeholder="e.g., Time Clock, Inventory System..."
                autoFocus
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>
                Abbreviation (max 4 characters)
              </label>
              <input
                value={newAppAbbr}
                onChange={(e) => setNewAppAbbr(e.target.value.slice(0, 4))}
                placeholder="e.g., TIME, INV"
                style={{ ...inputStyle, maxWidth: 150, textTransform: "uppercase" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>
                Link (URL)
              </label>
              <input
                value={newAppLink}
                onChange={(e) => setNewAppLink(e.target.value)}
                placeholder="https://example.com"
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              onClick={() => { setAddingApp(false); setNewAppName(""); setNewAppAbbr(""); setNewAppLink(""); }}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: t.text,
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <Btn primary darkMode={darkMode} t={t} onClick={handleAddApp} style={{ fontSize: 13, opacity: newAppName.trim() && newAppAbbr.trim() && newAppLink.trim() ? 1 : 0.4 }}>
              Create App
            </Btn>
          </div>
        </div>
      )}

      {customApps.length === 0 && !addingApp ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: t.surface,
          border: `1px dashed ${t.border}`,
          borderRadius: 12,
        }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: t.accentSoft, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LinkIcon size={28} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 8 }}>No custom apps yet</div>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>
            Create custom app shortcuts to display on the landing page.
          </div>
          <Btn primary darkMode={darkMode} t={t} onClick={() => { setAddingApp(true); setNewAppName(""); setNewAppAbbr(""); setNewAppLink(""); }} style={{ fontSize: 13 }}>
            <PlusIcon size={14} /> Add Custom App
          </Btn>
        </div>
      ) : (
        <>
          {customApps.length > 0 && !addingApp && (
            <Btn primary darkMode={darkMode} t={t} onClick={() => { setAddingApp(true); setNewAppName(""); setNewAppAbbr(""); setNewAppLink(""); }} style={{ fontSize: 13, marginBottom: 16 }}>
              <PlusIcon size={14} /> Add Custom App
            </Btn>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {customApps.map((app, idx) => {
              const isEditing = editingAppId === app.id;
              const abbr = app.abbreviation || app.name.substring(0, 2).toUpperCase();
              return (
                <div
                  key={app.id}
                  className="folder-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: t.surface,
                    border: `1px solid ${isEditing ? t.accent : t.border}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    boxShadow: isEditing ? `0 0 0 3px ${t.accentSoft}` : "none",
                    animation: `fadeIn 0.25s ease ${idx * 0.04}s both`,
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #88c0d0, #5b9bd5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {abbr}
                  </div>
                  <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input
                          value={editingAppName}
                          onChange={(e) => setEditingAppName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleUpdateApp(app.id); if (e.key === "Escape") setEditingAppId(null); }}
                          autoFocus
                          style={{ ...inputStyle, fontSize: 13, padding: "6px 10px" }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            value={editingAppAbbr}
                            onChange={(e) => setEditingAppAbbr(e.target.value.slice(0, 4))}
                            onKeyDown={(e) => { if (e.key === "Enter") handleUpdateApp(app.id); if (e.key === "Escape") setEditingAppId(null); }}
                            placeholder="ABBR"
                            style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", maxWidth: 100, textTransform: "uppercase" }}
                          />
                          <input
                            value={editingAppLink}
                            onChange={(e) => setEditingAppLink(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleUpdateApp(app.id); if (e.key === "Escape") setEditingAppId(null); }}
                            style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", flex: 1 }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{app.name}</div>
                        <div style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <LinkIcon size={12} /> {app.link}
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {isEditing ? (
                      <>
                        <SmallBtn t={t} title="Save" onClick={() => handleUpdateApp(app.id)}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>OK</span>
                        </SmallBtn>
                        <SmallBtn t={t} title="Cancel" onClick={() => setEditingAppId(null)}>
                          <XIcon size={12} />
                        </SmallBtn>
                      </>
                    ) : (
                      <>
                        <SmallBtn t={t} title="Edit" onClick={() => { setEditingAppId(app.id); setEditingAppName(app.name); setEditingAppAbbr(app.abbreviation || ""); setEditingAppLink(app.link); }}>
                          <EditIcon />
                        </SmallBtn>
                        <SmallBtn t={t} title="Delete" onClick={() => handleDeleteApp(app)}>
                          <TrashIcon size={12} />
                        </SmallBtn>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminPage({
  adminSection,
  setAdminSection,
  setPage,
  // Users
  adminUsers,
  setAdminUsers,
  setAdminSetPasswordUserId,
  setAdminSetPasswordForm,
  setAdminSetPasswordError,
  setAdminSetPasswordSuccess,
  // Groups
  securityGroups,
  setSecurityGroups,
  editingGroupId,
  setEditingGroupId,
  addingGroup,
  setAddingGroup,
  newGroupName,
  setNewGroupName,
  newGroupDesc,
  setNewGroupDesc,
  setWarningModal,
  // Current user
  loggedInUser,
  // Locations
  locations,
  setLocations,
  addingLocation,
  setAddingLocation,
  newLocationName,
  setNewLocationName,
  newLocationCode,
  setNewLocationCode,
  editingLocationId,
  setEditingLocationId,
  editingLocationName,
  setEditingLocationName,
  editingLocationCode,
  setEditingLocationCode,
  foldersInLocation,
  filesInFolder,
  handleDeleteLocation,
  // Departments
  departments,
  setDepartments,
  deptsInLocation,
  foldersInDepartment,
  addingDept,
  setAddingDept,
  addingDeptLocId,
  setAddingDeptLocId,
  newDeptName,
  setNewDeptName,
  editingDeptId,
  setEditingDeptId,
  editingDeptName,
  setEditingDeptName,
  handleDeleteDept,
  // Audit
  auditLog,
  auditFilterUser,
  setAuditFilterUser,
  auditFilterAction,
  setAuditFilterAction,
  auditFilterDate,
  setAuditFilterDate,
  // Access control
  locationAccess,
  setLocationAccess,
  departmentAccess,
  setDepartmentAccess,
// Subscriptions
  subscriptions,
  setSubscriptions,
  totalPermissionCount,
  setTotalPermissionCount,
  t,
  darkMode,
  addToast,
}) {
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(25);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditUser, setShowEditUser] = useState(false);
  const [permTab, setPermTab] = useState("dda");
  const [customApps, setCustomApps] = useState([]);
  const [customAppPerms, setCustomAppPerms] = useState({});

  const editLocRef = useRef(null);
  const addLocRef = useRef(null);
  const editDeptRef = useRef(null);
  const addDeptRef = useRef(null);

  const handleDeleteUser = (user) => {
    if (user.id === loggedInUser?.id) return;
    setWarningModal({
      title: "Delete User",
      message: `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.deleteUser(user.id);
          setAdminUsers((prev) => prev.filter((u) => u.id !== user.id));
          addToast("User deleted", `"${user.name}" has been deleted`, 4000, "delete");
        } catch (err) {
          console.error("Failed to delete user:", err);
        }
        setWarningModal(null);
      },
    });
  };

  useEffect(() => { if (editingLocationId && editLocRef.current) editLocRef.current.focus(); }, [editingLocationId]);
  useEffect(() => { if (addingLocation && addLocRef.current) addLocRef.current.focus(); }, [addingLocation]);
  useEffect(() => { if (editingDeptId && editDeptRef.current) editDeptRef.current.focus(); }, [editingDeptId]);
  useEffect(() => { if (addingDept && addDeptRef.current) addDeptRef.current.focus(); }, [addingDept]);
  
  useEffect(() => {
    if (editingGroupId) {
      loadCustomApps();
      loadCustomAppPermissions();
    }
  }, [editingGroupId]);

  const loadCustomApps = async () => {
    try {
      const apps = await api.getCustomApps();
      setCustomApps(apps);
    } catch (err) {
      console.error("Failed to load custom apps:", err);
    }
  };

  const loadCustomAppPermissions = async () => {
    try {
      const data = await api.getCustomAppPermissions();
      const permMap = {};
      Object.entries(data.permissions || {}).forEach(([key, canView]) => {
        const [appId, groupId] = key.split(':');
        if (!permMap[appId]) permMap[appId] = {};
        permMap[appId][groupId] = canView;
      });
      setCustomAppPerms(permMap);
    } catch (err) {
      console.error("Failed to load custom app permissions:", err);
    }
  };

  const toggleCustomAppPerm = async (appId, groupId, currentValue) => {
    try {
      await api.setCustomAppPermission(appId, groupId, !currentValue);
      setCustomAppPerms(prev => ({
        ...prev,
        [appId]: {
          ...(prev[appId] || {}),
          [groupId]: !currentValue
        }
      }));
    } catch (err) {
      console.error("Failed to update custom app permission:", err);
    }
  };

  const adminActiveMenu = ADMIN_MENU.find((m) => m.id === adminSection);
  const demoUsers = adminUsers;
  const demoGroups = securityGroups.map((g) => ({
    ...g,
    members: g.memberCount || 0,
    permCount: g.permissions ? Object.values(g.permissions).filter(Boolean).length : 0,
  }));

  // All groups for the access editor (simple id/name list)
  const allGroupsSimple = securityGroups.map((g) => ({ id: g.id, name: g.name }));

  // Group permission helpers
  const togglePerm = (groupId, perm) => {
    setSecurityGroups((p) => {
      const updated = p.map((g) => g.id === groupId ? { ...g, permissions: { ...g.permissions, [perm]: !g.permissions[perm] } } : g);
      const group = updated.find((g) => g.id === groupId);
      if (group) api.updateGroupPermissions(groupId, group.permissions).catch(console.error);
      return updated;
    });
  };
  const toggleAllInApp = (groupId, appId, value) => {
    const appConfig = APP_PERMISSIONS[appId];
    if (!appConfig) return;
    const permsInApp = appConfig.permissions.map(p => p.key);
    setSecurityGroups((p) => {
      const updated = p.map((g) => g.id === groupId ? { ...g, permissions: { ...g.permissions, ...Object.fromEntries(permsInApp.map((pk) => [pk, value])) } } : g);
      const group = updated.find((g) => g.id === groupId);
      if (group) api.updateGroupPermissions(groupId, group.permissions).catch(console.error);
      return updated;
    });
  };
  const toggleAllInCategory = (groupId, category, value) => {
    const permsInCat = Object.entries(PERMISSION_LABELS).filter(([, v]) => v.category === category).map(([k]) => k);
    setSecurityGroups((p) => {
      const updated = p.map((g) => g.id === groupId ? { ...g, permissions: { ...g.permissions, ...Object.fromEntries(permsInCat.map((pk) => [pk, value])) } } : g);
      const group = updated.find((g) => g.id === groupId);
      if (group) api.updateGroupPermissions(groupId, group.permissions).catch(console.error);
      return updated;
    });
  };
  const deleteGroup = (group) => {
    setWarningModal({
      title: `Delete "${group.name}"?`,
      message: `This will permanently remove the "${group.name}" security group. Users assigned to this group will lose these permissions.`,
      onConfirm: async () => {
        try { 
          await api.deleteGroup(group.id);
          addToast("Group deleted", `"${group.name}" has been deleted`, 4000, "delete");
        } catch (err) { console.error(err); }
        setSecurityGroups((p) => p.filter((g) => g.id !== group.id));
        if (editingGroupId === group.id) setEditingGroupId(null);
      },
    });
  };
  const addNewGroup = async () => {
    const n = newGroupName.trim();
    if (!n) return;
    try {
      const defaultPerms = { viewFiles: true, uploadFiles: false, deleteFiles: false, renameFiles: false, createFolders: false, deleteFolders: false, manageLocations: false, manageDepartments: false, manageUsers: false, manageGroups: false, viewAuditLog: false, exportAuditLog: false, manageSettings: false };
      const created = await api.createGroup(n, newGroupDesc.trim() || "Custom security group", defaultPerms);
      const newG = { id: created.id, name: created.name, desc: created.description, permissions: created.permissions || defaultPerms, memberCount: 0 };
      setSecurityGroups((p) => [...p, newG]);
      setEditingGroupId(newG.id);
      addToast("Group created", `"${n}" has been created`, 4000, "create");
    } catch (err) { console.error(err); }
    setAddingGroup(false);
    setNewGroupName("");
    setNewGroupDesc("");
  };

  const editingGroup = editingGroupId ? securityGroups.find((g) => g.id === editingGroupId) : null;

  // Access control handlers
  const handleSaveLocationAccess = async (locationId, groupIds) => {
    await api.updateLocationAccess(locationId, groupIds);
    // Refresh access data
    const data = await api.getLocationAccess();
    setLocationAccess(data);
  };

  const handleSaveDepartmentAccess = async (departmentId, groupIds) => {
    await api.updateDepartmentAccess(departmentId, groupIds);
    const data = await api.getDepartmentAccess();
    setDepartmentAccess(data);
  };

  // Audit
  const allActions = [...new Set(auditLog.map((e) => e.action))];
  const allUsers = [...new Set(auditLog.map((e) => e.user))];
  const filtered = auditLog.filter((e) => {
    if (auditFilterAction && e.action !== auditFilterAction) return false;
    if (auditFilterUser && e.user !== auditFilterUser) return false;
    if (auditFilterDate) {
      const entryDate = new Date(e.timestamp).toISOString().split("T")[0];
      if (entryDate !== auditFilterDate) return false;
    }
    return true;
  });
  const auditTotalPages = Math.max(1, Math.ceil(filtered.length / auditPageSize));
  const auditPageSafe = Math.min(auditPage, auditTotalPages);
  const auditPageStart = (auditPageSafe - 1) * auditPageSize;
  const auditPageEnd = auditPageStart + auditPageSize;
  const auditPageEntries = filtered.slice(auditPageStart, auditPageEnd);
  const handleAuditFilterChange = (setter) => (e) => { setter(e.target.value); setAuditPage(1); };
  const exportCSV = () => {
    const header = "Action,Detail,User,Date,Time";
    const rows = filtered.map((e) => {
      const d = new Date(e.timestamp);
      const date = d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
      const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const detail = e.detail.replace(/"/g, '""');
      return `"${e.action}","${detail}","${e.user}","${date}","${time}"`;
    });
    const csv = header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectStyle = { background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 7, padding: "7px 10px", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit", cursor: "pointer", minWidth: 130 };
  const actionColors = {
    "File Uploaded": { bg: t.successSoft, color: t.success },
    "File Renamed": { bg: t.accentSoft, color: t.accent },
    "Folder Created": { bg: t.accentSoft, color: t.accent },
    "Subfolder Created": { bg: t.accentSoft, color: t.accent },
    "Location Created": { bg: t.successSoft, color: t.success },
    "Location Renamed": { bg: t.accentSoft, color: t.accent },
    "Location Deleted": { bg: t.errorSoft, color: t.error },
    "Department Created": { bg: t.successSoft, color: t.success },
    "Department Renamed": { bg: t.accentSoft, color: t.accent },
    "Department Deleted": { bg: t.errorSoft, color: t.error },
    "Location Access Updated": { bg: t.accentSoft, color: t.accent },
    "Department Access Updated": { bg: t.accentSoft, color: t.accent },
  };

  return (
    <div style={{ display: "flex", flex: 1, minHeight: "calc(100vh - 55px)", paddingTop: 55, animation: "fadeIn 0.3s ease" }}>
      {/* Sidebar */}
      <div style={{ width: 300, minWidth: 300, borderRight: `1px solid ${t.border}`, background: darkMode ? "rgba(15,17,20,0.5)" : "rgba(246,244,240,0.6)", padding: "20px 10px", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 10px 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.textDim }}>Administration</div>
        {ADMIN_MENU.map((item) => {
          if (item.isCategory) {
            return (
              <div key={item.id} style={{ padding: "12px 12px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim, marginTop: 8 }}>
                {item.label}
              </div>
            );
          }
          return (
            <div key={item.id} onClick={() => setAdminSection(item.id)} className="admin-menu-item" style={{ padding: "9px 12px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: adminSection === item.id ? t.accentSoft : "transparent", color: adminSection === item.id ? t.accent : t.text, fontWeight: adminSection === item.id ? 600 : 500, fontSize: 13, borderLeft: adminSection === item.id ? `2px solid ${t.accent}` : "2px solid transparent", marginBottom: 2, marginLeft: item.category ? 12 : 0 }}>
              <span style={{ color: adminSection === item.id ? t.accent : t.textDim, display: "flex" }}>{item.icon}</span> {item.label}
            </div>
          );
        })}
      </div>
      {/* Content */}
      <div style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: t.accent }}>{adminActiveMenu?.icon}</span> {adminActiveMenu?.label}</h1>
              <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>{adminActiveMenu?.desc}</p>
            </div>
            {adminSection === "users" && <Btn primary darkMode={darkMode} t={t} onClick={() => setShowAddUser(true)} style={{ fontSize: 12 }}><PlusIcon size={13} /> Add User</Btn>}
            {adminSection === "groups" && !addingGroup && <Btn primary darkMode={darkMode} t={t} onClick={() => { setAddingGroup(true); setNewGroupName(""); setNewGroupDesc(""); }} style={{ fontSize: 12 }}><PlusIcon size={13} /> Add Group</Btn>}
            {adminSection === "locations" && !addingLocation && <Btn primary darkMode={darkMode} t={t} onClick={() => { setAddingLocation(true); setNewLocationName(""); setNewLocationCode(""); }} style={{ fontSize: 12 }}><PlusIcon size={13} /> Add Location</Btn>}
            {adminSection === "app-center" && <Btn primary darkMode={darkMode} t={t} onClick={() => setPage("landing")} style={{ fontSize: 12 }}>View Landing Page</Btn>}
          </div>

          {/* USERS */}
          {adminSection === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {demoUsers.map((u, i) => (
                <div key={i} className="folder-row" style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", animation: `fadeIn 0.25s ease ${i * 0.04}s both` }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{u.name.charAt(0)}</div>
                    <div><div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 11, color: t.textDim }}>{u.email}</div></div>
                  </div>
                  <div style={{ width: 180, display: "flex", gap: 4, flexWrap: "wrap" }}>{u.groups.map((g) => <span key={g} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: g === "Administrator" ? t.accentSoft : darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: g === "Administrator" ? t.accent : t.textMuted }}>{g}</span>)}</div>
                  <div style={{ width: 80, textAlign: "center" }}><span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: u.status === "Active" ? t.successSoft : t.errorSoft, color: u.status === "Active" ? t.success : t.error }}>{u.status}</span></div>
                  <div style={{ width: 90, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                    <SmallBtn t={t} title="Set Password" onClick={() => { setAdminSetPasswordUserId(u.id); setAdminSetPasswordForm({ new: "", confirm: "" }); setAdminSetPasswordError(""); setAdminSetPasswordSuccess(""); }}><ShieldIcon size={12} /></SmallBtn>
                    <SmallBtn t={t} title="Edit" onClick={() => { setEditingUser(u); setShowEditUser(true); }}><EditIcon /></SmallBtn>
                    {u.id !== loggedInUser?.id && (
                      <SmallBtn t={t} title="Remove" onClick={() => handleDeleteUser(u)}><TrashIcon size={12} /></SmallBtn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GROUPS */}
          {adminSection === "groups" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              {addingGroup && (
                <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16, boxShadow: `0 0 0 3px ${t.accentSoft}`, animation: "fadeIn 0.2s ease" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><ShieldIcon size={16} /> New Security Group</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Group Name</label>
                      <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNewGroup(); if (e.key === "Escape") { setAddingGroup(false); setNewGroupName(""); setNewGroupDesc(""); } }} placeholder="e.g. Supervisor, Auditor..." autoFocus style={{ width: "100%", padding: "9px 12px", fontSize: 13.5, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box", fontWeight: 500 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Description</label>
                      <input value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNewGroup(); if (e.key === "Escape") { setAddingGroup(false); setNewGroupName(""); setNewGroupDesc(""); } }} placeholder="Brief description of this role..." style={{ width: "100%", padding: "9px 12px", fontSize: 13, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button onClick={() => { setAddingGroup(false); setNewGroupName(""); setNewGroupDesc(""); }} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: t.text, fontFamily: "inherit" }}>Cancel</button>
                    <Btn primary darkMode={darkMode} t={t} onClick={addNewGroup} style={{ padding: "7px 16px", fontSize: 12.5, opacity: newGroupName.trim() ? 1 : 0.4 }}>Create Group</Btn>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ width: editingGroupId ? 280 : "100%", minWidth: editingGroupId ? 280 : undefined, transition: "width 0.3s", display: "flex", flexDirection: "column", gap: 4 }}>
                  {demoGroups.map((g, i) => {
                    const isActive = editingGroupId === g.id;
                    return (
                      <div key={g.id} onClick={() => setEditingGroupId(isActive ? null : g.id)} className="folder-row" style={{ display: "flex", alignItems: "center", background: isActive ? t.accentSoft : t.surface, border: `1px solid ${isActive ? t.accent + "60" : t.border}`, borderRadius: 10, padding: editingGroupId ? "10px 12px" : "14px 16px", cursor: "pointer", transition: "all 0.2s", animation: `fadeIn 0.25s ease ${i * 0.04}s both` }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: editingGroupId ? 28 : 34, height: editingGroupId ? 28 : 34, borderRadius: 8, background: isActive ? t.accent + "20" : g.name === "Administrator" ? t.accentSoft : darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", color: isActive ? t.accent : g.name === "Administrator" ? t.accent : t.textMuted, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}><ShieldIcon size={editingGroupId ? 13 : 16} /></div>
                          <div>
                            <div style={{ fontSize: editingGroupId ? 12 : 13, fontWeight: 600, color: isActive ? t.accent : t.text }}>{g.name}</div>
                            {!editingGroupId && <div style={{ fontSize: 11, color: t.textDim }}>{g.desc}</div>}
                          </div>
                        </div>
                        {!editingGroupId && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span title="Permissions enabled" style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: t.successSoft, color: t.success }}>{g.permCount}/{totalPermissionCount}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: g.members > 0 ? t.accent : t.textDim, background: g.members > 0 ? t.accentSoft : "transparent", padding: "2px 9px", borderRadius: 12 }}>{g.members} member{g.members !== 1 ? "s" : ""}</span>
                        </div>}
                        {editingGroupId && <span style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 7px", borderRadius: 8, background: t.successSoft, color: t.success }}>{g.permCount}</span>}
                        {!editingGroupId && <div style={{ width: 60, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                          <SmallBtn t={t} title="Edit Permissions" onClick={(e) => { e.stopPropagation(); setEditingGroupId(g.id); }}><EditIcon /></SmallBtn>
                          <SmallBtn t={t} title="Remove" onClick={(e) => { e.stopPropagation(); deleteGroup(g); }}><TrashIcon size={12} /></SmallBtn>
                        </div>}
                      </div>
                    );
                  })}
                </div>
                {editingGroup && (
                  <div style={{ flex: 1, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", animation: "fadeIn 0.25s ease" }}>
                    <div style={{ padding: "18px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><ShieldIcon size={18} /></div>
                          <div>
                            <div style={{ fontSize: 17, fontWeight: 700 }}>{editingGroup.name}</div>
                            <div style={{ fontSize: 11.5, color: t.textMuted }}>{editingGroup.desc}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, marginTop: 2 }}>
                        <button onClick={() => deleteGroup(editingGroup)} style={{ background: t.errorSoft, color: t.error, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><TrashIcon size={11} /> Delete</button>
                        <button onClick={() => setEditingGroupId(null)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: t.textDim, display: "flex", fontFamily: "inherit" }}><XIcon size={14} /></button>
                      </div>
                    </div>
                    <div style={{ padding: "12px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Permissions</span>
                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: t.successSoft, color: t.success }}>{Object.values(editingGroup.permissions).filter(Boolean).length} of {totalPermissionCount} enabled</span>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { const allTrue = Object.fromEntries(Object.keys(editingGroup.permissions).map((k) => [k, true])); setSecurityGroups((p) => p.map((g) => g.id === editingGroupId ? { ...g, permissions: allTrue } : g)); api.updateGroupPermissions(editingGroupId, allTrue).catch(console.error); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 11, fontWeight: 600, fontFamily: "inherit", padding: "4px 6px" }}>Enable All</button>
                          <span style={{ color: t.textDim }}>·</span>
                          <button onClick={() => { const allFalse = Object.fromEntries(Object.keys(editingGroup.permissions).map((k) => [k, false])); setSecurityGroups((p) => p.map((g) => g.id === editingGroupId ? { ...g, permissions: allFalse } : g)); api.updateGroupPermissions(editingGroupId, allFalse).catch(console.error); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.error, fontSize: 11, fontWeight: 600, fontFamily: "inherit", padding: "4px 6px" }}>Disable All</button>
                        </div>
                      </div>
                      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: 6, overflowX: "auto" }}>
                        {["dda", "cht", "help", "admin", "custom"].map((appId) => {
                          const app = APP_PERMISSIONS[appId];
                          const isActive = permTab === appId;
                          const appColor = appId === "custom" ? "#8b5cf6" : app?.color || "#6b7280";
                          return (
                            <button key={appId} onClick={() => setPermTab(appId)} style={{ background: isActive ? appColor + "15" : "transparent", border: `1px solid ${isActive ? appColor + "40" : t.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: isActive ? appColor : t.textMuted, fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s" }}>
                              {appId === "custom" ? "Custom Apps" : app?.name || appId.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ padding: "16px 20px", maxHeight: 420, overflowY: "auto" }}>
                        {permTab === "custom" ? (
                          customApps.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px 20px", color: t.textMuted }}>
                              <div style={{ fontSize: 13, marginBottom: 8 }}>No custom apps configured</div>
                              <div style={{ fontSize: 11 }}>Create custom apps in App Center to manage visibility</div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {customApps.map((app) => {
                                const canView = customAppPerms[app.id]?.[editingGroupId] ?? false;
                                return (
                                  <div key={app.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", borderRadius: 8, border: `1px solid ${t.border}` }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                      <div style={{ width: 36, height: 36, borderRadius: 8, background: app.color || "#6b7280", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{(app.abbreviation || app.name?.slice(0, 3) || "APP").toUpperCase()}</div>
                                      <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{app.name}</div>
                                        <div style={{ fontSize: 11, color: t.textMuted }}>{app.link}</div>
                                      </div>
                                    </div>
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                      <span style={{ fontSize: 11, color: canView ? t.success : t.textMuted }}>{canView ? "Visible" : "Hidden"}</span>
                                      <div onClick={() => toggleCustomAppPerm(app.id, editingGroupId, canView)} style={{ width: 36, height: 20, borderRadius: 10, background: canView ? t.success : darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", position: "relative", cursor: "pointer", transition: "background 0.15s" }}>
                                        <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 2, left: canView ? 18 : 2, transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                                      </div>
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        ) : (
                          (() => {
                            const app = APP_PERMISSIONS[permTab];
                            if (!app) return null;
                            const permsInApp = app.permissions;
                            const enabledInApp = permsInApp.filter((p) => editingGroup.permissions[p.key]).length;
                            const allEnabled = enabledInApp === permsInApp.length;
                            return (
                              <div style={{ animation: "fadeIn 0.2s ease" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 2px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{app.name}</span>
                                    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 6, background: enabledInApp > 0 ? t.successSoft : "transparent", color: enabledInApp > 0 ? t.success : t.textDim }}>{enabledInApp}/{permsInApp.length}</span>
                                  </div>
                                  <button onClick={() => toggleAllInApp(editingGroupId, permTab, !allEnabled)} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 11, fontWeight: 600, fontFamily: "inherit", padding: "2px 4px" }}>{allEnabled ? "Disable All" : "Enable All"}</button>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  {permsInApp.map((perm) => (
                                    <PermToggle key={perm.key} checked={editingGroup.permissions[perm.key]} onChange={() => togglePerm(editingGroupId, perm.key)} label={perm.label} desc={perm.desc} t={t} darkMode={darkMode} />
                                  ))}
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LOCATIONS */}
          {adminSection === "locations" && (
            <div>
              {/* Info banner */}
              <div style={{
                padding: "12px 16px",
                borderRadius: 10,
                marginBottom: 16,
                background: darkMode ? "rgba(88,166,255,0.05)" : "rgba(79,70,229,0.04)",
                border: `1px solid ${darkMode ? "rgba(88,166,255,0.12)" : "rgba(79,70,229,0.1)"}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                color: t.textMuted,
              }}>
                <ShieldIcon size={16} />
                <span>
                  Use the <strong style={{ color: t.text }}>Group Access</strong> column to restrict locations to specific security groups. Locations set to "All Groups" are visible to everyone.
                </span>
              </div>

              {addingLocation && (
                <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12, boxShadow: `0 0 0 3px ${t.accentSoft}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <span style={{ color: t.accent }}><MapPinIcon size={18} /></span>
                    <input ref={addLocRef} value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} placeholder="Location name..." style={{ flex: 1, background: "transparent", border: "none", fontSize: 14, color: t.text, outline: "none", fontFamily: "inherit", fontWeight: 500 }} />
                    <input value={newLocationCode} onChange={(e) => setNewLocationCode(e.target.value.toUpperCase())} placeholder="R001" maxLength={4} style={{ width: 70, background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", fontWeight: 600, textAlign: "center" }} title="Location Code (e.g., R001)" />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Btn primary darkMode={darkMode} t={t} onClick={() => {
                      const n = newLocationName.trim();
                      const code = newLocationCode.trim();
                      if (code && !/^R\d{3}$/.test(code)) {
                        addToast("Invalid code", "Location code must be R followed by 3 digits", 4000, "error");
                        return;
                      }
                      if (n) {
                        api.createLocation(n, code || null).then((created) => {
                          setLocations((p) => [...p, { id: created.id, name: created.name, locationCode: created.location_code }]);
                          setNewLocationName("");
                          setNewLocationCode("");
                          setAddingLocation(false);
                          addToast("Location created", `"${n}" has been created`, 4000, "create");
                        }).catch((err) => {
                          addToast("Error", err.message || "Failed to create location", 5000, "error");
                        });
                      }
                    }} style={{ padding: "6px 14px", fontSize: 12 }}>Add Location</Btn>
                    <button onClick={() => { setAddingLocation(false); setNewLocationName(""); setNewLocationCode(""); }} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: t.textDim, fontFamily: "inherit", fontSize: 12 }}>Cancel</button>
                  </div>
                </div>
              )}
<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {locations.map((loc, idx) => {
                   const lf = foldersInLocation(loc.id), lFiles = lf.reduce((s, f) => s + filesInFolder(f.id).length, 0), isEd = editingLocationId === loc.id;
                   const locGroups = locationAccess[loc.id] || [];
                   return (
                     <div key={loc.id} className="folder-row" style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${isEd ? t.accent : t.border}`, borderRadius: 10, padding: isEd ? "10px 16px" : "12px 16px", boxShadow: isEd ? `0 0 0 3px ${t.accentSoft}` : "none", animation: `fadeIn 0.25s ease ${idx * 0.04}s both` }}>
                       <div style={{ width: 34, height: 34, borderRadius: 8, background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><MapPinIcon size={16} /></div>
                       <div style={{ flex: 1, marginLeft: 10 }}>
                         {isEd ? (
                           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                             <input ref={editLocRef} value={editingLocationName} onChange={(e) => setEditingLocationName(e.target.value)} placeholder="Location name" style={{ flex: 1, background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 13.5, fontWeight: 600, color: t.text, outline: "none", fontFamily: "inherit" }} />
                             <input value={editingLocationCode || ""} onChange={(e) => setEditingLocationCode(e.target.value.toUpperCase())} placeholder="R001" maxLength={4} style={{ width: 70, background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", fontWeight: 600, textAlign: "center" }} title="Location Code" />
                           </div>
                         ) : (
                           <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                             <div style={{ fontSize: 13.5, fontWeight: 600 }}>{loc.name}</div>
                             {loc.locationCode && <div style={{ fontSize: 10.5, fontWeight: 700, color: t.accent, background: t.accentSoft, padding: "2px 8px", borderRadius: 10 }}>{loc.locationCode}</div>}
                           </div>
                         )}
                       </div>
                       <div style={{ width: 80, textAlign: "center" }}><span style={{ fontSize: 11, fontWeight: 600, color: lf.length > 0 ? t.accent : t.textDim, background: lf.length > 0 ? t.accentSoft : "transparent", padding: "2px 9px", borderRadius: 12 }}>{lf.length}</span></div>
                       <div style={{ width: 70, textAlign: "center", fontSize: 11, color: t.textDim }}>{lFiles} files</div>
                       {/* Group Access Editor */}
                       <div style={{ width: 180, display: "flex", justifyContent: "center" }}>
                         <GroupAccessEditor
                           entityId={loc.id}
                           assignedGroups={locGroups}
                           allGroups={allGroupsSimple}
                           onSave={handleSaveLocationAccess}
                           t={t}
                           darkMode={darkMode}
                         />
                       </div>
                       {isEd ? (
                         <div style={{ width: 120, display: "flex", justifyContent: "flex-end", gap: 6 }}>
                           <Btn primary darkMode={darkMode} t={t} onClick={() => {
                             const n = editingLocationName.trim();
                             const code = editingLocationCode?.trim() || null;
                             if (code && !/^R\d{3}$/.test(code)) {
                               addToast("Invalid code", "Location code must be R followed by 3 digits", 4000, "error");
                               return;
                             }
                             if (n) {
                               api.updateLocation(loc.id, n, code).then((updated) => {
                                 setLocations((p) => p.map((l) => l.id === loc.id ? { ...l, name: n, locationCode: updated.location_code } : l));
                                 setEditingLocationId(null);
                               }).catch((err) => {
                                 addToast("Error", err.message || "Failed to update location", 5000, "error");
                               });
                             }
                           }} style={{ padding: "5px 12px", fontSize: 11.5 }}>Save</Btn>
                           <button onClick={() => setEditingLocationId(null)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: t.textDim, fontFamily: "inherit", fontSize: 11.5 }}>Cancel</button>
                         </div>
                       ) : (
                         <div style={{ width: 70, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                           <SmallBtn t={t} title="Edit" onClick={() => { setEditingLocationId(loc.id); setEditingLocationName(loc.name); setEditingLocationCode(loc.locationCode || ""); }}><EditIcon /></SmallBtn>
                           <SmallBtn t={t} title="Remove" onClick={() => handleDeleteLocation(loc)}><TrashIcon size={12} /></SmallBtn>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
            </div>
          )}

          {/* DEPARTMENTS */}
          {adminSection === "departments" && (
            <div>
              {/* Info banner */}
              <div style={{
                padding: "12px 16px",
                borderRadius: 10,
                marginBottom: 16,
                background: darkMode ? "rgba(88,166,255,0.05)" : "rgba(79,70,229,0.04)",
                border: `1px solid ${darkMode ? "rgba(88,166,255,0.12)" : "rgba(79,70,229,0.1)"}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                color: t.textMuted,
              }}>
                <ShieldIcon size={16} />
                <span>
                  Restrict individual departments to specific security groups. Departments set to "All Groups" are visible to all users who can access the parent location.
                </span>
              </div>

              {locations.map((loc, li) => {
                const ld = deptsInLocation(loc.id), isAddHere = addingDept && addingDeptLocId === loc.id;
                return (
                  <div key={loc.id} style={{ marginBottom: 28, animation: `fadeIn 0.25s ease ${li * 0.05}s both` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><MapPinIcon size={16} /><span style={{ fontSize: 14, fontWeight: 700 }}>{loc.name}</span><span style={{ fontSize: 10.5, color: t.textDim }}>{ld.length} dept{ld.length !== 1 ? "s" : ""}</span></div>
                      {!isAddHere && <button onClick={() => { setAddingDept(true); setAddingDeptLocId(loc.id); setNewDeptName(""); }} style={{ background: "transparent", border: `1px dashed ${t.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 500, color: t.textMuted, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><PlusIcon size={11} /> Add</button>}
                    </div>
                    {isAddHere && (
                      <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, boxShadow: `0 0 0 3px ${t.accentSoft}` }}>
                        <span style={{ color: t.accent }}><LayersIcon size={16} /></span>
                        <input ref={addDeptRef} value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { const n = newDeptName.trim(); if (n) { api.createDepartment(n, loc.id).then((created) => { setDepartments((p) => [...p, { id: created.id, name: created.name, locationId: created.location_id || loc.id }]); setNewDeptName(""); setAddingDept(false); setAddingDeptLocId(null); addToast("Department created", `"${n}" has been created`, 4000, "create"); }).catch(console.error); } } if (e.key === "Escape") { setAddingDept(false); setAddingDeptLocId(null); } }} placeholder="Department name..." style={{ flex: 1, background: "transparent", border: "none", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", fontWeight: 500 }} />
                        <Btn primary darkMode={darkMode} t={t} onClick={() => { const n = newDeptName.trim(); if (n) { api.createDepartment(n, loc.id).then((created) => { setDepartments((p) => [...p, { id: created.id, name: created.name, locationId: created.location_id || loc.id }]); setNewDeptName(""); setAddingDept(false); setAddingDeptLocId(null); addToast("Department created", `"${n}" has been created`, 4000, "create"); }).catch(console.error); } }} style={{ padding: "5px 12px", fontSize: 11.5 }}>Add</Btn>
                        <button onClick={() => { setAddingDept(false); setAddingDeptLocId(null); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, display: "flex", padding: 3 }}><XIcon size={14} /></button>
                      </div>
                    )}
                    {ld.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {ld.map((dept, di) => {
                          const df = foldersInDepartment(dept.id), dFiles = df.reduce((s, f) => s + filesInFolder(f.id).length, 0), isEd = editingDeptId === dept.id;
                          const deptGroups = departmentAccess[dept.id] || [];
                          return (
                            <div key={dept.id} className="folder-row" style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${isEd ? t.accent : t.border}`, borderRadius: 9, padding: "10px 14px", boxShadow: isEd ? `0 0 0 3px ${t.accentSoft}` : "none", animation: `fadeIn 0.2s ease ${di * 0.03}s both` }}>
                              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 9 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 7, background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><LayersIcon size={14} /></div>
                                {isEd ? <input ref={editDeptRef} value={editingDeptName} onChange={(e) => setEditingDeptName(e.target.value)} onBlur={() => { const n = editingDeptName.trim(); if (n && n !== dept.name) { api.updateDepartment(dept.id, n).then(() => setDepartments((p) => p.map((d) => d.id === dept.id ? { ...d, name: n } : d))).catch(console.error); } setEditingDeptId(null); }} onKeyDown={(e) => { if (e.key === "Enter") { const n = editingDeptName.trim(); if (n && n !== dept.name) { api.updateDepartment(dept.id, n).then(() => setDepartments((p) => p.map((d) => d.id === dept.id ? { ...d, name: n } : d))).catch(console.error); } setEditingDeptId(null); } if (e.key === "Escape") setEditingDeptId(null); }} style={{ flex: 1, background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.accent}`, borderRadius: 6, padding: "4px 9px", fontSize: 13, fontWeight: 600, color: t.text, outline: "none", fontFamily: "inherit" }} /> : <div style={{ fontSize: 13, fontWeight: 600 }}>{dept.name}</div>}
                              </div>
                              <span style={{ fontSize: 10.5, color: t.textDim, width: 60, textAlign: "center" }}>{df.length} folders</span>
                              <span style={{ fontSize: 10.5, color: t.textDim, width: 50, textAlign: "center" }}>{dFiles} files</span>
                              {/* Group Access Editor */}
                              <div style={{ width: 180, display: "flex", justifyContent: "center" }}>
                                <GroupAccessEditor
                                  entityId={dept.id}
                                  assignedGroups={deptGroups}
                                  allGroups={allGroupsSimple}
                                  onSave={handleSaveDepartmentAccess}
                                  t={t}
                                  darkMode={darkMode}
                                />
                              </div>
{!isEd && <div style={{ width: 60, display: "flex", justifyContent: "flex-end", gap: 2 }}><SmallBtn t={t} title="Edit" onClick={() => { setEditingDeptId(dept.id); setEditingDeptName(dept.name); }}><EditIcon /></SmallBtn><SmallBtn t={t} title="Remove" onClick={() => handleDeleteDept(dept, loc.name)}><TrashIcon size={12} /></SmallBtn></div>}
                            </div>
                          );
                        })}
                      </div>
                    ) : !isAddHere && (
                      <div style={{ padding: 20, textAlign: "center", color: t.textDim, fontSize: 12.5, background: t.surface, border: `1px dashed ${t.border}`, borderRadius: 9 }}>No departments for {loc.name}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* AUDIT */}
          {adminSection === "audit" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <select value={auditFilterAction} onChange={handleAuditFilterChange(setAuditFilterAction)} style={selectStyle}><option value="">All Actions</option>{allActions.map((a) => <option key={a} value={a}>{a}</option>)}</select>
                <select value={auditFilterUser} onChange={handleAuditFilterChange(setAuditFilterUser)} style={selectStyle}><option value="">All Users</option>{allUsers.map((u) => <option key={u} value={u}>{u}</option>)}</select>
                <input type="date" value={auditFilterDate} onChange={handleAuditFilterChange(setAuditFilterDate)} style={{ ...selectStyle, minWidth: 150 }} />
                {(auditFilterUser || auditFilterAction || auditFilterDate) && (
                  <button onClick={() => { setAuditFilterUser(""); setAuditFilterAction(""); setAuditFilterDate(""); setAuditPage(1); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 12, fontWeight: 500, fontFamily: "inherit", padding: "7px 4px" }}>Clear Filters</button>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: t.textDim }}>{filtered.length} of {auditLog.length} entries</span>
                {filtered.length > 0 && <Btn darkMode={darkMode} t={t} onClick={exportCSV} style={{ fontSize: 11.5, padding: "6px 12px" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Export CSV</Btn>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 14px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim }}>
                <div style={{ width: 130 }}>Action</div><div style={{ flex: 1 }}>Detail</div><div style={{ width: 100, textAlign: "right" }}>User</div><div style={{ width: 150, textAlign: "right" }}>Date & Time</div>
              </div>
              {filtered.length > 0 ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {auditPageEntries.map((entry, idx) => {
                      const date = new Date(entry.timestamp);
                      const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                      const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
                      const isDeleted = entry.action.includes("Deleted") || entry.action.includes("Deleting");
                      const ac = actionColors[entry.action] || (isDeleted ? { bg: t.errorSoft, color: t.error } : { bg: t.accentSoft, color: t.accent });
                      return (
                        <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 14px", animation: `fadeIn 0.15s ease ${Math.min(idx, 20) * 0.02}s both` }}>
                          <div style={{ width: 130, flexShrink: 0 }}><span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: ac.bg, color: ac.color, whiteSpace: "nowrap" }}>{entry.action}</span></div>
                          <div style={{ flex: 1, fontSize: 12.5, color: t.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={entry.detail}>{entry.detail}</div>
                          <div style={{ width: 100, fontSize: 11, color: t.textMuted, textAlign: "right", flexShrink: 0 }}>{entry.user}</div>
                          <div style={{ width: 150, fontSize: 10.5, color: t.textDim, textAlign: "right", flexShrink: 0 }}>{dateStr} {timeStr}</div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Pagination Bar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 10 }}>
                    {/* Per-page selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: t.textDim }}>Rows per page:</span>
                      {[25, 50, 100].map((size) => (
                        <button
                          key={size}
                          onClick={() => { setAuditPageSize(size); setAuditPage(1); }}
                          style={{
                            background: auditPageSize === size ? t.accent : "transparent",
                            color: auditPageSize === size ? "#fff" : t.textMuted,
                            border: `1px solid ${auditPageSize === size ? t.accent : t.border}`,
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {/* Page info + prev/next */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: t.textDim }}>
                        {auditPageStart + 1}–{Math.min(auditPageEnd, filtered.length)} of {filtered.length}
                      </span>
                      <button
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                        disabled={auditPageSafe <= 1}
                        style={{
                          background: "transparent",
                          border: `1px solid ${t.border}`,
                          borderRadius: 6,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: auditPageSafe <= 1 ? "not-allowed" : "pointer",
                          color: auditPageSafe <= 1 ? t.textDim : t.text,
                          fontFamily: "inherit",
                          opacity: auditPageSafe <= 1 ? 0.45 : 1,
                          transition: "all 0.15s ease",
                        }}
                      >
                        ← Prev
                      </button>
                      {/* Page number pills */}
                      {Array.from({ length: auditTotalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === auditTotalPages || Math.abs(p - auditPageSafe) <= 1)
                        .reduce((acc, p, i, arr) => {
                          if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === "..." ? (
                            <span key={`ellipsis-${i}`} style={{ fontSize: 12, color: t.textDim, padding: "0 2px" }}>…</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => setAuditPage(p)}
                              style={{
                                background: auditPageSafe === p ? t.accent : "transparent",
                                color: auditPageSafe === p ? "#fff" : t.textMuted,
                                border: `1px solid ${auditPageSafe === p ? t.accent : t.border}`,
                                borderRadius: 6,
                                minWidth: 30,
                                padding: "4px 8px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {p}
                            </button>
                          )
                        )}
                      <button
                        onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                        disabled={auditPageSafe >= auditTotalPages}
                        style={{
                          background: "transparent",
                          border: `1px solid ${t.border}`,
                          borderRadius: 6,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: auditPageSafe >= auditTotalPages ? "not-allowed" : "pointer",
                          color: auditPageSafe >= auditTotalPages ? t.textDim : t.text,
                          fontFamily: "inherit",
                          opacity: auditPageSafe >= auditTotalPages ? 0.45 : 1,
                          transition: "all 0.15s ease",
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </>
              ) : auditLog.length > 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: t.textDim }}>
                  <SearchIcon size={32} />
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 12 }}>No entries match your filters</div>
                  <button onClick={() => { setAuditFilterUser(""); setAuditFilterAction(""); setAuditFilterDate(""); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 12, fontWeight: 500, fontFamily: "inherit", marginTop: 8 }}>Clear Filters</button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 0", color: t.textDim }}>
                  <ClipboardIcon size={36} />
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 14 }}>No activity yet</div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>File uploads, renames, and folder changes will appear here</div>
                </div>
              )}
            </div>
          )}

          {/* Fallback */}
          {!["users", "groups", "app-center", "locations", "departments", "audit", "authentication", "settings"].includes(adminSection) && (
            <div style={{ textAlign: "center", padding: "60px 0", color: t.textDim }}>
              <span>{adminActiveMenu?.icon}</span>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 14 }}>{adminActiveMenu?.label}</div>
              <div style={{ fontSize: 13 }}>Under development</div>
            </div>
          )}

          {/* AUTHENTICATION */}
          {adminSection === "authentication" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              <AuthenticationSection t={t} darkMode={darkMode} />
            </div>
          )}

          {/* SETTINGS */}
          {adminSection === "settings" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              <SettingsSection t={t} darkMode={darkMode} addToast={addToast} />
            </div>
          )}

          {/* DMS CONNECTION */}
          {adminSection === "dms" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              <DmsSection t={t} darkMode={darkMode} addToast={addToast} />
            </div>
          )}

          {/* APP CENTER */}
          {adminSection === "app-center" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              <AppCenterSection t={t} darkMode={darkMode} addToast={addToast} />
            </div>
          )}
        </div>
      </div>

      <AddUserModal
        show={showAddUser}
        onClose={() => setShowAddUser(false)}
        groups={securityGroups}
        onUserCreated={async () => {
          const users = await api.getUsers();
          setAdminUsers(users.map((u) => ({
            name: u.display_name,
            email: u.email,
            groups: u.groups || [],
            status: u.status === "active" ? "Active" : "Inactive",
            id: u.id,
            groupIds: u.groups || [],
          })));
          addToast("User created", "New user has been created successfully", 4000, "create");
        }}
        t={t}
        darkMode={darkMode}
      />
      <EditUserModal
        show={showEditUser}
        onClose={() => { setShowEditUser(false); setEditingUser(null); }}
        user={editingUser}
        groups={securityGroups}
        onUserUpdated={async () => {
          const users = await api.getUsers();
          setAdminUsers(users.map((u) => ({
            name: u.display_name,
            email: u.email,
            groups: u.groups || [],
            status: u.status === "active" ? "Active" : "Inactive",
            id: u.id,
            groupIds: u.groups || [],
          })));
        }}
        t={t}
        darkMode={darkMode}
      />
    </div>
  );
}
