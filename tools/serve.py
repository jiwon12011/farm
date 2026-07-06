#!/usr/bin/env python3
"""개발 서버 — 모든 응답에 no-cache 헤더를 붙여 캐시 문제를 원천 차단.
사용: python3 tools/serve.py [포트]
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # 조용히


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), NoCacheHandler) as srv:
        print(f'서빙: {ROOT} → http://127.0.0.1:{PORT}')
        srv.serve_forever()
