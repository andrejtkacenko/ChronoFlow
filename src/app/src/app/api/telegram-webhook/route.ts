
import { POST, GET } from '@/app/api/telegram-webhook/route';

// This is a workaround to handle incorrect webhook URLs that might have been set.
// It simply re-exports the correct handlers from the intended location.
export { POST, GET };
