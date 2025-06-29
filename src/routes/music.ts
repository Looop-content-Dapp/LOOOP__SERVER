import { Router, Request, Response } from 'express';

const router: Router = Router();

// Music routes (to be implemented)
// router.get('/tracks', getTracks);
// router.post('/tracks', uploadTrack);
// router.get('/tracks/:id', getTrack);
// router.get('/playlists', getPlaylists);
// router.post('/playlists', createPlaylist);

router.get('/health', (_req: Request, res: Response) => {
  res.json({ message: 'Music routes are ready for implementation' });
});

export default router;
