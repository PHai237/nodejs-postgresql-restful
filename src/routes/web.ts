import express, {Express} from 'express';
import { getHomePage, getCreateUserPage, postCreateUserPage, postDeleteUser, getViewUser, postUpdateUser } from 'controllers/UserController';

const router = express.Router();

const webRoutes = (app: Express) => {
    router.get('/', getHomePage);
    router.get('/create-user', getCreateUserPage);
    router.post('/create-user', postCreateUserPage);
    router.post('/delete-user/:id', postDeleteUser);
    router.get('/view-user/:id', getViewUser);
    router.post('/update-user', postUpdateUser);

    app.use('/', router);
}

export default webRoutes;