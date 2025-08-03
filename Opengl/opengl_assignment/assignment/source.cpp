#include <GL/glut.h>
#include <cmath>

// Global variables
float boatX = -1.2f;  // Starting X position of the boat
bool isNight = false; // State variable for day/night toggle

// Forward declaration for the drawCircle function used in drawBoat
void drawCircle(float cx, float cy, float r, int num_segments);

void drawCloud(float x, float y)
{
    glColor3f(1.0f, 1.0f, 1.0f);
    drawCircle(x, y, 0.07f, 100);
    drawCircle(x + 0.07f, y + 0.02f, 0.07f, 100);
    drawCircle(x - 0.07f, y + 0.02f, 0.07f, 100);
}

void drawTree(float x, float y, float size)
{
    // Trunk
    glColor3f(0.55f, 0.27f, 0.07f);
    glBegin(GL_POLYGON);
    glVertex2f(x - 0.01f, y);
    glVertex2f(x + 0.01f, y);
    glVertex2f(x + 0.01f, y + 0.05f);
    glVertex2f(x - 0.01f, y + 0.05f);
    glEnd();

    // Leaves
    glColor3f(0.0f, 0.5f, 0.0f);
    glBegin(GL_TRIANGLES);
    glVertex2f(x, y + 0.13f * size);
    glVertex2f(x - 0.05f * size, y + 0.05f);
    glVertex2f(x + 0.05f * size, y + 0.05f);
    glEnd();
}

void drawHouse(float x, float y, bool isRed)
{
    // Walls
    if (isRed)
        glColor3f(1.0f, 0.27f, 0.0f);
    else
        glColor3f(0.0f, 0.7f, 0.6f);

    glBegin(GL_POLYGON);
    glVertex2f(x, y);
    glVertex2f(x + 0.2f, y);
    glVertex2f(x + 0.2f, y + 0.15f);
    glVertex2f(x, y + 0.15f);
    glEnd();

    // Roof
    glColor3f(0.4f, 0.2f, 0.0f);
    glBegin(GL_POLYGON);
    glVertex2f(x - 0.02f, y + 0.15f);
    glVertex2f(x + 0.1f, y + 0.22f);
    glVertex2f(x + 0.22f, y + 0.15f);
    glEnd();

    // Door
    glColor3f(0.0f, 0.3f, 0.3f);
    glBegin(GL_POLYGON);
    glVertex2f(x + 0.08f, y);
    glVertex2f(x + 0.12f, y);
    glVertex2f(x + 0.12f, y + 0.08f);
    glVertex2f(x + 0.08f, y + 0.08f);
    glEnd();

    // Set window color based on day/night
    if (isNight)
    {
        glColor3f(1.0f, 1.0f, 0.0f); // Bright yellow for lit windows
    }
    else
    {
        glColor3f(0.0f, 0.3f, 0.3f); // Dark windows for day
    }

    // Draw windows with the chosen color
    glBegin(GL_POLYGON); // Left window
    glVertex2f(x + 0.02f, y + 0.1f);
    glVertex2f(x + 0.05f, y + 0.1f);
    glVertex2f(x + 0.05f, y + 0.13f);
    glVertex2f(x + 0.02f, y + 0.13f);
    glEnd();

    glBegin(GL_POLYGON); // Right window
    glVertex2f(x + 0.15f, y + 0.1f);
    glVertex2f(x + 0.18f, y + 0.1f);
    glVertex2f(x + 0.18f, y + 0.13f);
    glVertex2f(x + 0.15f, y + 0.13f);
    glEnd();
}

void drawBoat()
{
    glPushMatrix();
    glTranslatef(boatX, -0.6f, 0.0f);

    // Boat body
    glColor3f(0.0f, 0.0f, 0.5f);
    glBegin(GL_POLYGON);
    glVertex2f(-0.1f, 0.0f);
    glVertex2f(0.1f, 0.0f);
    glVertex2f(0.07f, -0.05f);
    glVertex2f(-0.07f, -0.05f);
    glEnd();

    // Cabin
    glColor3f(1.0f, 0.0f, 0.0f);
    glBegin(GL_POLYGON);
    glVertex2f(-0.05f, 0.0f);
    glVertex2f(-0.05f, 0.05f);
    glVertex2f(0.0f, 0.05f);
    glVertex2f(0.0f, 0.0f);
    glEnd();

    // Boat light, only visible at night
    if (isNight)
    {
        glColor3f(1.0f, 1.0f, 0.0f); // Yellow light
        drawCircle(0.0f, 0.07f, 0.015f, 100);
    }

    glPopMatrix();
}

void drawCircle(float cx, float cy, float r, int num_segments)
{
    glBegin(GL_POLYGON);
    for (int i = 0; i < num_segments; ++i)
    {
        float theta = 2.0f * 3.1415926f * float(i) / float(num_segments);
        float x = r * cos(theta);
        float y = r * sin(theta);
        glVertex2f(x + cx, y + cy);
    }
    glEnd();
}

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);

    // Day/Night Scene Change
    if (isNight)
    {
        // Night Sky
        glColor3f(0.0f, 0.0f, 0.15f); // Dark Blue
        glBegin(GL_POLYGON);
        glVertex2f(-1.0f, 0.0f);
        glVertex2f(1.0f, 0.0f);
        glVertex2f(1.0f, 1.0f);
        glVertex2f(-1.0f, 1.0f);
        glEnd();

        // Moon
        glColor3f(0.9f, 0.9f, 0.9f); // Light Gray
        drawCircle(0.6f, 0.8f, 0.1f, 100);
    }
    else
    {
        // Day Sky
        glColor3f(0.4f, 0.8f, 1.0f);
        glBegin(GL_POLYGON);
        glVertex2f(-1.0f, 0.0f);
        glVertex2f(1.0f, 0.0f);
        glVertex2f(1.0f, 1.0f);
        glVertex2f(-1.0f, 1.0f);
        glEnd();

        // Sun
        glColor3f(1.0f, 1.0f, 0.0f);
        drawCircle(0.6f, 0.8f, 0.1f, 100);

        // Clouds only visible during the day
        drawCloud(-0.7f, 0.8f);
        drawCloud(0.3f, 0.85f);
    }

    // Mountains
    glColor3f(0.8f, 0.5f, 0.2f);
    glBegin(GL_TRIANGLES);
    glVertex2f(-1.0f, 0.0f);
    glVertex2f(-0.7f, 0.5f);
    glVertex2f(-0.4f, 0.0f);
    glEnd();

    glBegin(GL_TRIANGLES);
    glVertex2f(-0.3f, 0.0f);
    glVertex2f(0.0f, 0.5f);
    glVertex2f(0.3f, 0.0f);
    glEnd();

    glBegin(GL_TRIANGLES);
    glVertex2f(0.2f, 0.0f);
    glVertex2f(0.5f, 0.5f);
    glVertex2f(0.8f, 0.0f);
    glEnd();

    // Land
    glColor3f(0.4f, 0.8f, 0.2f);
    glBegin(GL_POLYGON);
    glVertex2f(-1.0f, -0.4f);
    glVertex2f(1.0f, -0.4f);
    glVertex2f(1.0f, 0.0f);
    glVertex2f(-1.0f, 0.0f);
    glEnd();

    // Houses
    drawHouse(-0.8f, -0.3f, true);
    drawHouse(0.4f, -0.3f, false);

    // Trees
    drawTree(-0.3f, -0.3f, 1.0f);
    drawTree(-0.1f, -0.3f, 1.2f);
    drawTree(0.7f, -0.3f, 1.1f);
    drawTree(-0.5f, -0.3f, 0.7f);

    // River
    glColor3f(0.4f, 0.6f, 0.9f);
    glBegin(GL_POLYGON);
    glVertex2f(-1.0f, -1.0f);
    glVertex2f(1.0f, -1.0f);
    glVertex2f(1.0f, -0.4f);
    glVertex2f(-1.0f, -0.4f);
    glEnd();

    // Boat
    drawBoat();

    glFlush();
    glutSwapBuffers();
}

void update(int value)
{
    boatX += 0.005f;
    if (boatX > 1.2f)
        boatX = -1.2f;

    glutPostRedisplay();
    glutTimerFunc(20, update, 0);
}

void keyboard(unsigned char key, int x, int y)
{
    switch (key)
    {
    case 'n':
    case 'N':
        isNight = !isNight; // Toggle the day/night state
        break;
    }
    glutPostRedisplay(); // Redraw the scene to reflect changes
}

void init()
{
    glClearColor(0.0f, 0.6f, 1.0f, 1.0f);
    glMatrixMode(GL_PROJECTION);
    gluOrtho2D(-1.0, 1.0, -1.0, 1.0);
}

int main(int argc, char **argv)
{
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB);
    glutInitWindowSize(1000, 700);
    glutCreateWindow("Boat");

    init();
    glutDisplayFunc(display);
    glutKeyboardFunc(keyboard); // Register keyboard callback
    glutTimerFunc(20, update, 0);
    glutMainLoop();
    return 0;
}