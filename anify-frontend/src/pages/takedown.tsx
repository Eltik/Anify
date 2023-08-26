import { type NextPage } from "next";
import Head from "next/head";
import Footer from "~/components/footer";
import Navbar from "~/components/navbar";
import Sidebar from "~/components/sidebar";

const DMCA: NextPage<any, any> = () => {
    return (
    <>
        <Head>
            <title>DMCA</title>
            <meta name="title" content="Anify" />
            <meta name="description" content="The ultimate Japanese media destination." />

            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://anify.tv/" />
            <meta property="og:title" content="Anify" />
            <meta property="og:description" content="The ultimate Japanese media destination." />
            <meta property="og:image" content="" />

            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content="https://anify.tv/" />
            <meta property="twitter:title" content="Anify" />
            <meta property="twitter:description" content="The ultimate Japanese media destination." />
            <meta property="twitter:image" content="" />
            <link rel="icon" href="/favicon.ico" />
        </Head>
        <main>
            <Sidebar active="anime" />
            <Navbar active="anime" />
            <div className="text-white px-5 mt-24 md:ml-24 md:mr-6 mx-auto mb-8">
                <h1 className="text-4xl mb-5">DMCA takedown request requirements</h1>
                <p>We take the intellectual property rights of others seriously and require that our users do the same. The Digital Millennium Copyright Act (DMCA) established a process for addressing claims of copyright infringement. If you own a copyright or have authority to act on behalf of a copyright owner and want to report a claim that a third party is infringing that material on or through GitLab&apos;s services, please submit a DMCA report via Discord or email and we will take appropriate action.</p>
                <br />
                <h2 className="text-3xl mb-3">DMCA Report Requirements</h2>
                <ul className="list-disc">
                    <li>A description of the copyrighted work that you claim is being infringed;</li>
                    <li>A description of the material you claim is infringing and that you want removed or access to which you want disabled with a URL and proof you are the original owner or other location of that material;</li>
                    <li>Your name, title (if acting as an agent), address, telephone number, and email address;</li>
                    <li>The following statement: <i>&quot;I have a good faith belief that the use of the copyrighted material I am complaining of is not authorized by the copyright owner, its agent, or the law (e.g., as a fair use)&quot;;</i></li>
                    <li>The following statement: <i>&quot;The information in this notice is accurate and, under penalty of perjury, I am the owner, or authorized to act on behalf of the owner, of the copyright or of an exclusive right that is allegedly infringed&quot;;</i></li>
                    <li>The following statement: <i>&quot;I understand that I am subject to legal action upon submitting a DMCA request without solid proof.&quot;;</i></li>
                    <li>An electronic or physical signature of the owner of the copyright or a person authorized to act on the owner&apos;s behalf.</li>
                </ul>
                <div className="content_footer">
                    <h4>Your DMCA take down request should be submit via the following links:</h4>
                    <ul>
                        <li>Contact through Discord via <a href="/discord">https://anify.tv/discord</a></li>
                        <li>Contact through email via dmca@anify.tv</li>
                    </ul>
                    <p>We will then review your DMCA request and take proper actions, including removal of the content from the website.</p>
                </div>
            </div>
            <Footer />
        </main>
    </>
    );
};

export default DMCA;