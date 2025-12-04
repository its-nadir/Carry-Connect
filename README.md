# CarryConnect

CarryConnect is a web application designed to connect travelers with individuals who need to send packages. By leveraging available luggage space, the platform facilitates efficient and community-driven delivery solutions.

## Features

*   **User Authentication**: Secure sign-up and login functionality using Email/Password and Google Authentication.
*   **Carrier Discovery**: Advanced search functionality to find travelers heading to specific destinations.
*   **Messaging System**: Integrated real-time chat to facilitate communication between senders and carriers.
*   **User Profiles**: Comprehensive profiles featuring ratings, reviews, and trip history to build trust.
*   **Trip Management**: Tools for travelers to schedule and manage their upcoming trips.
*   **Real-time Updates**: Powered by Firebase Firestore for instant data synchronization.

## Technology Stack

*   **Frontend**: Next.js 16, React 19, TailwindCSS
*   **Backend**: Firebase (Firestore, Authentication, Hosting)
*   **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

*   Node.js 20 or higher
*   npm (Node Package Manager)
*   Firebase CLI (`npm install -g firebase-tools`)
*   A Firebase project

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/its-nadir/Carry-Connect.git
    cd Carry-Connect
    ```

2.  Install dependencies:
    ```bash
    cd next-app
    npm install
    ```

### Configuration

1.  **Firebase Setup**:
    *   Create a project in the [Firebase Console](https://console.firebase.google.com/).
    *   Register a web app to obtain your configuration keys.
    *   Enable **Authentication** (Email/Password, Google).
    *   Create a **Firestore Database** (Production mode, recommended region: `europe-west10`).

2.  **Environment Variables**:
    Create a `.env.local` file in the `next-app` directory and populate it with your Firebase credentials:

    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

3.  **Deploy Security Rules**:
    ```bash
    firebase deploy --only firestore:rules
    ```

### Running the Application

Start the development server:

```bash
cd next-app
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Deployment

### Manual Deployment

To deploy the application to Firebase Hosting manually:

```bash
cd next-app
npm run build
cd ..
firebase deploy
```

Alternatively, use the provided script:
```bash
./deploy.sh
```

### Automated Deployment

This repository includes a GitHub Actions workflow for continuous deployment. To enable it:

1.  Obtain a Firebase CI token: `firebase login:ci`
2.  Add the token as `FIREBASE_TOKEN` in your GitHub repository secrets.
3.  Add all `NEXT_PUBLIC_FIREBASE_*` environment variables to the repository secrets.
4.  Push changes to the `main` branch to trigger the deployment.

## Project Structure

```
Carry-Connect/
├── next-app/               # Main Next.js application source
│   ├── app/                # App Router: pages, layouts, and components
│   ├── lib/                # Shared libraries and Firebase configuration
│   └── public/             # Static assets
├── db/                     # Database configuration and rules
├── .github/                # GitHub Actions workflows
└── scripts/                # Utility scripts
```


## Contributing

We welcome contributions to CarryConnect! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any inquiries or support, please contact the team at groupegteamproject@gmail.com.
