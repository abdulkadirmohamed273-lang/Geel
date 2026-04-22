import React, { useState, useEffect } from 'react';

function NoticeBoard({ currentUser, db, setActiveView }) {
    const [noticeContent, setNoticeContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [hasNotice, setHasNotice] = useState(false);
    const [currentNoticeId, setCurrentNoticeId] = useState(null);

    useEffect(() => {
        loadNotice();
    }, [db]);

    const loadNotice = async () => {
        try {
            setLoading(true);
            const notices = await db.getAll('notices');
            if (notices && notices.length > 0) {
                setNoticeContent(notices[0].content || '');
                setCurrentNoticeId(notices[0].id);
                setHasNotice(true);
            } else {
                setNoticeContent('');
                setCurrentNoticeId(null);
                setHasNotice(false);
            }
        } catch (err) {
            console.error('Error loading notice:', err);
            setNoticeContent('');
            setHasNotice(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!noticeContent.trim()) {
            alert('⚠️ Please enter notice content');
            return;
        }
        
        try {
            setSaving(true);
            
            if (hasNotice && currentNoticeId) {
                // Update existing notice
                const success = await db.update('notices', currentNoticeId, {
                    content: noticeContent.trim(),
                    updated_by: currentUser.name || currentUser.username || currentUser.id
                });
                
                if (success) {
                    alert('✅ Notice updated successfully!');
                    await loadNotice(); // Reload to get updated data
                    setActiveView('dashboard');
                } else {
                    alert('❌ Failed to update notice. Please check console for details.');
                }
            } else {
                // Create new notice
                const newNotice = await db.add('notices', {
                    content: noticeContent.trim(),
                    created_by: currentUser.name || currentUser.username || currentUser.id,
                    updated_by: currentUser.name || currentUser.username || currentUser.id
                });
                
                if (newNotice) {
                    alert('✅ Notice created successfully!');
                    await loadNotice(); // Reload to get new notice
                    setActiveView('dashboard');
                } else {
                    alert('❌ Failed to create notice. Please check console for details.');
                }
            }
        } catch (err) {
            console.error('Error saving notice:', err);
            alert(`❌ Error saving notice: ${err.message || 'Unknown error'}\n\nPlease check:\n1. Database table exists\n2. Database permissions\n3. Console for details`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!hasNotice || !currentNoticeId) {
            alert('⚠️ No notice to delete');
            return;
        }

        if (!window.confirm('⚠️ Are you sure you want to delete this notice?\n\nThis action cannot be undone.')) {
            return;
        }

        try {
            setDeleting(true);
            const result = await db.delete('notices', currentNoticeId);
            
            if (result === false) {
                throw new Error('Delete operation returned false. Check database permissions.');
            }
            
            alert('✅ Notice deleted successfully!');
            setNoticeContent('');
            setHasNotice(false);
            setCurrentNoticeId(null);
            setActiveView('dashboard');
        } catch (err) {
            console.error('Error deleting notice:', err);
            const errorMessage = err.message || 'Unknown error occurred';
            alert(`❌ Error deleting notice: ${errorMessage}\n\nPlease check:\n1. Database permissions (RLS policies)\n2. Console for detailed error information`);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-bell"></i> Notice Board Management
                </div>
                <div className="card-body text-center p-4">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header bg-primary text-white">
                <i className="fas fa-bell"></i> Notice Board Management
            </div>
            <div className="card-body">
                <div className="alert alert-info">
                    <i className="fas fa-info-circle"></i> 
                    This notice will appear on the home page and reception dashboard.
                </div>
                
                <div className="mb-3">
                    <label className="form-label fw-bold">Notice Content *</label>
                    <textarea 
                        className="form-control" 
                        rows="8" 
                        placeholder="Enter notice content..." 
                        value={noticeContent}
                        onChange={(e) => setNoticeContent(e.target.value)}
                        required
                        disabled={saving || deleting}
                        style={{ minHeight: '150px' }}
                    />
                    <small className="text-muted">
                        <i className="fas fa-info-circle me-1"></i>
                        You can use multiple lines. The notice will be displayed as formatted.
                    </small>
                </div>
                
                <div className="d-flex gap-2 flex-wrap">
                    <button 
                        className="btn btn-primary" 
                        onClick={handleSave}
                        disabled={saving || deleting || !noticeContent.trim()}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save me-2"></i> Save Notice
                            </>
                        )}
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => setActiveView('dashboard')}
                        disabled={saving || deleting}
                    >
                        <i className="fas fa-times me-2"></i> Cancel
                    </button>
                    {hasNotice && (
                        <button 
                            className="btn btn-danger" 
                            onClick={handleDelete}
                            disabled={saving || deleting}
                        >
                            {deleting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-trash me-2"></i> Delete Notice
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default NoticeBoard;

