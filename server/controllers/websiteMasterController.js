import Banner from '../models/Banner.js';
import VideoGallery from '../models/VideoGallery.js';
import OurTeam from '../models/OurTeam.js';
import TravelInspiration from '../models/TravelInspiration.js';
import CustomizeTrip from '../models/CustomizeTrip.js';
import { logActivity } from '../utils/activityLog.js';

/* ============================ BANNER MASTER ============================ */
export const listBanners = async (req, res) => res.json(await Banner.find().sort({ createdAt: -1 }));
export const createBanner = async (req, res) => {
  const { title, bannerImage } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Title is required.' });
  const row = await Banner.create({ title, bannerImage: bannerImage || '' });
  await logActivity(req, { action: 'CREATE', module: 'Banner', recordId: row._id, recordLabel: row.title, message: 'Banner created' });
  res.status(201).json(row);
};
export const updateBanner = async (req, res) => {
  const row = await Banner.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Banner not found' });
  if (req.body.title !== undefined) row.title = req.body.title;
  if (req.body.bannerImage !== undefined) row.bannerImage = req.body.bannerImage;
  await row.save();
  await logActivity(req, { action: 'UPDATE', module: 'Banner', recordId: row._id, recordLabel: row.title, message: 'Banner updated' });
  res.json(row);
};
export const deleteBanner = async (req, res) => {
  const row = await Banner.findByIdAndDelete(req.params.id);
  if (row) await logActivity(req, { action: 'DELETE', module: 'Banner', recordId: row._id, recordLabel: row.title, message: 'Banner deleted' });
  res.json({ message: 'Banner deleted' });
};

/* ============================ VIDEO GALLERY MASTER ============================ */
export const listVideos = async (req, res) => res.json(await VideoGallery.find().sort({ createdAt: -1 }));
export const createVideo = async (req, res) => {
  const { title, description, video_url_link } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Title is required.' });
  const row = await VideoGallery.create({ title, description: description || '', video_url_link: video_url_link || '' });
  await logActivity(req, { action: 'CREATE', module: 'VideoGallery', recordId: row._id, recordLabel: row.title, message: 'Video created' });
  res.status(201).json(row);
};
export const updateVideo = async (req, res) => {
  const row = await VideoGallery.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Video not found' });
  ['title', 'description', 'video_url_link'].forEach((k) => { if (req.body[k] !== undefined) row[k] = req.body[k]; });
  await row.save();
  await logActivity(req, { action: 'UPDATE', module: 'VideoGallery', recordId: row._id, recordLabel: row.title, message: 'Video updated' });
  res.json(row);
};
export const deleteVideo = async (req, res) => {
  const row = await VideoGallery.findByIdAndDelete(req.params.id);
  if (row) await logActivity(req, { action: 'DELETE', module: 'VideoGallery', recordId: row._id, recordLabel: row.title, message: 'Video deleted' });
  res.json({ message: 'Video deleted' });
};

/* ============================ OUR TEAM MASTER ============================ */
export const listTeam = async (req, res) => res.json(await OurTeam.find().sort({ createdAt: -1 }));
export const createTeam = async (req, res) => {
  const { name, designation, photo, department, flag } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
  const row = await OurTeam.create({
    name, designation: designation || '', photo: photo || '', department: department || '',
    flag: flag === 'second' ? 'second' : 'first',
  });
  await logActivity(req, { action: 'CREATE', module: 'OurTeam', recordId: row._id, recordLabel: row.name, message: 'Team member created' });
  res.status(201).json(row);
};
export const updateTeam = async (req, res) => {
  const row = await OurTeam.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Team member not found' });
  ['name', 'designation', 'photo', 'department'].forEach((k) => { if (req.body[k] !== undefined) row[k] = req.body[k]; });
  if (req.body.flag !== undefined) row.flag = req.body.flag === 'second' ? 'second' : 'first';
  await row.save();
  await logActivity(req, { action: 'UPDATE', module: 'OurTeam', recordId: row._id, recordLabel: row.name, message: 'Team member updated' });
  res.json(row);
};
export const deleteTeam = async (req, res) => {
  const row = await OurTeam.findByIdAndDelete(req.params.id);
  if (row) await logActivity(req, { action: 'DELETE', module: 'OurTeam', recordId: row._id, recordLabel: row.name, message: 'Team member deleted' });
  res.json({ message: 'Team member deleted' });
};

/* ============================ TRAVEL INSPIRATION (admin list) ============================ */
// Supports an email filter (?email=). Export is done client-side from this data.
export const listTravelInspirations = async (req, res) => {
  const filter = {};
  if (req.query.email) filter.email = new RegExp(String(req.query.email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  res.json(await TravelInspiration.find(filter).sort({ createdAt: -1 }));
};

/* ============================ CUSTOMIZE TRIP (admin list + detail) ============================ */
// Supports package (?package_id=) and date (?from=&to=) filters.
export const listCustomizeTrips = async (req, res) => {
  const filter = {};
  if (req.query.package_id) filter.package_id = req.query.package_id;
  if (req.query.from || req.query.to) {
    filter.create_at = {};
    if (req.query.from) filter.create_at.$gte = new Date(req.query.from);
    if (req.query.to) { const t = new Date(req.query.to); t.setHours(23, 59, 59, 999); filter.create_at.$lte = t; }
  }
  res.json(await CustomizeTrip.find(filter).populate('package_id', 'name').sort({ create_at: -1 }));
};
export const getCustomizeTrip = async (req, res) => {
  const row = await CustomizeTrip.findById(req.params.id).populate('package_id', 'name');
  if (!row) return res.status(404).json({ message: 'Request not found' });
  res.json(row);
};
