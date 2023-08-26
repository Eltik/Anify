import AuthProvider from ".";

export default class Simkl extends AuthProvider {
    override rateLimit = 250;
    override id = "simkl";
    override name = "Simkl";
    override url = "https://simkl.com";
    override icon = "https://us.simkl.in/img_blog_2012/logo.png";
    override clientSecret = "";
    override clientId = "";
    override redirectUri = "";

    get oauthURL(): string {
        return "";
    }
}
