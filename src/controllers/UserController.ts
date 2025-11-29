import { Request, Response } from 'express';
import { createUser, deleteUser, getAllUsers, getUserById, updateUserById } from 'services/user-service';

const getHomePage = async (req: Request, res: Response) => {
    //get users
    const users = await getAllUsers();

    return res.render('home', {
        users: users
    });
}

const getCreateUserPage = (req: Request, res: Response) => {
    return res.render('create-user.ejs');
}

const postCreateUserPage = async (req: Request, res: Response) => {
    const {fullName, email, address} = req.body;

    await createUser(fullName, email, address);

    // create user
    return res.redirect('/');
}

const postDeleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    await deleteUser(id);
    return res.redirect('/');
}

const getViewUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    // get user by id
    const user = await getUserById(id);

    return res.render('view-user.ejs', {
        id: id,
        user: user
    })
}

const postUpdateUser = async (req: Request, res: Response) => {
    const { id, fullName, email, address } = req.body;

    // update user by id
    await updateUserById(id, fullName, email, address);

    return res.redirect('/');
}

export { getHomePage, getCreateUserPage, postCreateUserPage, postDeleteUser, getViewUser, postUpdateUser };