import { Layout } from 'antd';

const Footer = () => {
  return (
    <Layout.Footer className="app-footer">
      <div className="footer-content">
        <div className="footer-copyright">
          2025 Route Builder by Ha Nguyen (binbinhihi)
        </div>
        <div className="footer-kofi">
          <a
            href="https://ko-fi.com/binbinhihi"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              height="36"
              style={{ border: 0, height: 36 }}
              src="https://storage.ko-fi.com/cdn/kofi3.png?v=6"
              alt="Buy Me a Coffee at ko-fi.com"
            />
          </a>
        </div>
      </div>
    </Layout.Footer>
  );
};

export default Footer;
