import { Router, Request, Response } from 'express';

const router: Router = Router();

// NFT routes (to be implemented)
// router.get('/my-nfts', getUserNFTs);
// router.post('/mint', mintNFT);
// router.get('/:id', getNFT);
// router.post('/:id/transfer', transferNFT);

router.get('/health', (_req: Request, res: Response) => {
  res.json({ message: 'NFT routes are ready for implementation' });
});

export default router;
