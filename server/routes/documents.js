const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /api/documents/upload (Upload CV, ID, Contract, etc.)
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a file to upload.' });
    }

    const { title, category, employee_id, expiration_date, status, notes } = req.body;
    const isManager = req.user.role === 'manager';

    // Target employee
    let targetEmployeeId = req.user.employee_id;
    if (isManager && employee_id) {
      targetEmployeeId = parseInt(employee_id, 10);
    }

    if (!targetEmployeeId) {
      return res.status(400).json({ error: 'No valid employee associated.' });
    }

    const docTitle = title ? title.trim() : req.file.originalname;
    const docCategory = category || 'employment';
    const filePath = `/uploads/${req.file.filename}`;

    const result = db.prepare(`
      INSERT INTO documents (employee_id, title, category, file_name, file_path, file_size, mime_type, expiration_date, status, notes, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      targetEmployeeId,
      docTitle,
      docCategory,
      req.file.originalname,
      filePath,
      req.file.size,
      req.file.mimetype,
      expiration_date || null,
      status || 'valid',
      notes || '',
      req.user.id
    );

    const created = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Document uploaded successfully.',
      document: created
    });
  } catch (err) {
    console.error('Upload document error:', err);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});

// GET /api/documents/my (Employee view their own documents)
router.get('/my', authenticate, (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) return res.json({ documents: [] });

    const documents = db.prepare(`
      SELECT d.*, u.username as uploaded_by_username
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.employee_id = ?
      ORDER BY d.uploaded_at DESC
    `).all(employeeId);

    res.json({ documents });
  } catch (err) {
    console.error('Get my documents error:', err);
    res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
});

// GET /api/documents/all (Manager view all documents)
router.get('/all', authenticate, requireManager, (req, res) => {
  try {
    const { category, employee_id, search } = req.query;

    let query = `
      SELECT d.*, e.first_name, e.last_name, e.employee_code, e.department,
             u.username as uploaded_by_username
      FROM documents d
      JOIN employees e ON d.employee_id = e.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND d.category = ?';
      params.push(category);
    }
    if (employee_id) {
      query += ' AND d.employee_id = ?';
      params.push(employee_id);
    }
    if (search) {
      query += ' AND (d.title LIKE ? OR d.file_name LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY d.uploaded_at DESC';
    const documents = db.prepare(query).all(...params);

    res.json({ documents });
  } catch (err) {
    console.error('Get all documents error:', err);
    res.status(500).json({ error: 'Failed to retrieve documents list.' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const isManager = req.user.role === 'manager';
    const isOwner = req.user.employee_id === doc.employee_id;

    if (!isManager && !isOwner) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Attempt to remove physical file if exists
    const fullPath = path.join(__dirname, '..', doc.file_path);
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch (e) {}
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(docId);
    res.json({ message: 'Document deleted successfully.' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

module.exports = router;
