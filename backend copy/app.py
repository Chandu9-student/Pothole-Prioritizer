import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    app.run(debug=False, host='0.0.0.0', port=port)
